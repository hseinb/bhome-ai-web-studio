import { DriveAsset } from '../types/catalog';

// Storage keys
const GOOGLE_CLIENT_ID_KEY = 'PC_GOOGLE_CLIENT_ID';
const GOOGLE_ACCESS_TOKEN_KEY = 'PC_GOOGLE_ACCESS_TOKEN';
const GOOGLE_USER_EMAIL_KEY = 'PC_GOOGLE_USER_EMAIL';

// Default / fallback client ID for quick setup (can be overwritten in UI)
export function getGoogleClientId(): string {
  return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '';
}

export function setGoogleClientId(clientId: string): void {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId.trim());
}

export function getGoogleDriveAccessToken(): string | null {
  return sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
}

export function getGoogleUserEmail(): string | null {
  return sessionStorage.getItem(GOOGLE_USER_EMAIL_KEY);
}

export function setGoogleDriveAuth(accessToken: string, email?: string): void {
  sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, accessToken);
  if (email) sessionStorage.setItem(GOOGLE_USER_EMAIL_KEY, email);
}

export function clearGoogleDriveAuth(): void {
  sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(GOOGLE_USER_EMAIL_KEY);
}

/**
 * Loads the Google Identity Services (GIS) script dynamically
 */
export function loadGoogleGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Initiates Google OAuth2 Popup flow to request Drive Read-Only permissions
 */
export async function signInWithGoogleDrive(customClientId?: string): Promise<string> {
  await loadGoogleGisScript();

  const clientId = customClientId || getGoogleClientId();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is required. Please set it in Drive Settings.');
  }

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services library is not loaded'));
        return;
      }

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(`Google OAuth error: ${tokenResponse.error_description || tokenResponse.error}`));
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token received from Google'));
            return;
          }

          // Optional: Fetch user email for display
          let userEmail = '';
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              userEmail = userData.email || '';
            }
          } catch {
            // Non-blocking
          }

          setGoogleDriveAuth(accessToken, userEmail);
          resolve(accessToken);
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Converts a Google Drive File ID into a high-performance direct CDN image URL (lh3)
 */
export function getDirectDriveImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Queries Google Drive REST API v3 for folders inside parentFolderId (or root)
 */
export async function listDriveFolders(
  accessToken: string,
  parentFolderId: string = 'root'
): Promise<{ id: string; name: string }[]> {
  const q = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearGoogleDriveAuth();
      throw new Error('Google Drive session expired. Please sign in again.');
    }
    throw new Error(`Google Drive API error: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name
  }));
}

/**
 * Queries Google Drive REST API v3 for image files
 */
export async function listDriveImages(
  accessToken: string,
  folderId?: string,
  searchQuery?: string,
  pageToken?: string
): Promise<{ files: DriveAsset[]; nextPageToken?: string }> {
  let queryParts: string[] = ["trashed = false", "mimeType contains 'image/'"];

  if (folderId && folderId !== 'all') {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (searchQuery && searchQuery.trim()) {
    const cleanSearch = searchQuery.trim().replace(/'/g, "\\'");
    queryParts.push(`name contains '${cleanSearch}'`);
  }

  const q = queryParts.join(' and ');
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink,size,parents)&orderBy=modifiedTime desc&pageSize=60`;
  
  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearGoogleDriveAuth();
      throw new Error('Google Drive session expired. Please sign in again.');
    }
    throw new Error(`Google Drive API error: ${res.statusText}`);
  }

  const data = await res.json();
  const files: DriveAsset[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    url: getDirectDriveImageUrl(f.id),
    thumbnailUrl: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+/, '=s400') : getDirectDriveImageUrl(f.id),
    sizeBytes: parseInt(f.size || '0', 10),
    folder: folderId || 'Drive'
  }));

  return {
    files,
    nextPageToken: data.nextPageToken
  };
}
