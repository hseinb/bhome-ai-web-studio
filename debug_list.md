# Active Debugging List

| ID | Issue Description | Component / File | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| DBG-01 | Stage 1 Studio Staging is using 2D Canvas fallback rather than authentic AI background isolation. | `src/api/geminiAiApi.ts:119-200` | In-Progress | Public Gemini developer API endpoint is vision/text only; needs AI background removal model (e.g. BiRefNet / Rembg / Photoroom) or image-to-image pipeline. |
| DBG-02 | Stage 3 Copywriting returned mock fallback text when API key is missing or call fails. | `src/api/geminiAiApi.ts:44-114` | In-Progress | Needs configured API key and validated `gemini-2.0-flash` endpoint to inspect image bytes and generate true product descriptions. |
| DBG-03 | Stage 4 Lifestyle Scene is using 2D Canvas image overlay over Unsplash background. | `src/api/geminiAiApi.ts:206-280` | In-Progress | Needs in-situ generative model integration or real background synthesis. |
