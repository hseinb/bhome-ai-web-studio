import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

interface MultiSelectPillPickerProps {
  label: string;
  selectedValues: string[];
  availableOptions: string[];
  onChange: (values: string[]) => void;
  colorTheme?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose';
  placeholder?: string;
  badgeSuffix?: string;
}

export const MultiSelectPillPicker: React.FC<MultiSelectPillPickerProps> = ({
  label,
  selectedValues,
  availableOptions,
  onChange,
  colorTheme = 'emerald',
  placeholder = 'Add new...',
  badgeSuffix
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Normalize array (no duplicates, trimmed)
  const cleanSelected = Array.from(new Set(selectedValues.map((v) => v.trim()).filter(Boolean)));

  const handleToggle = (value: string) => {
    const cleanVal = value.trim();
    if (cleanSelected.includes(cleanVal)) {
      onChange(cleanSelected.filter((v) => v !== cleanVal));
    } else {
      onChange([...cleanSelected, cleanVal]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanVal = value.trim();
    onChange(cleanSelected.filter((v) => v !== cleanVal));
  };

  const handleAddCustom = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = customInput.trim();
      if (val && !cleanSelected.includes(val)) {
        onChange([...cleanSelected, val]);
        setCustomInput('');
      }
    }
  };

  const handleAddCustomClick = () => {
    const val = customInput.trim();
    if (val && !cleanSelected.includes(val)) {
      onChange([...cleanSelected, val]);
      setCustomInput('');
    }
  };

  // Color theme classes
  const themeStyles = {
    emerald: {
      activeBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
      activeBorder: 'border-emerald-500/30',
      tagBadge: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:border-emerald-400',
      focusRing: 'focus:border-emerald-500'
    },
    amber: {
      activeBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
      activeBorder: 'border-amber-500/30',
      tagBadge: 'bg-amber-950/60 text-amber-400 border-amber-500/30 hover:border-amber-400',
      focusRing: 'focus:border-amber-500'
    },
    blue: {
      activeBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',
      activeBorder: 'border-blue-500/30',
      tagBadge: 'bg-blue-950/60 text-blue-400 border-blue-500/30 hover:border-blue-400',
      focusRing: 'focus:border-blue-500'
    },
    purple: {
      activeBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30',
      activeBorder: 'border-purple-500/30',
      tagBadge: 'bg-purple-950/60 text-purple-400 border-purple-500/30 hover:border-purple-400',
      focusRing: 'focus:border-purple-500'
    },
    rose: {
      activeBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
      activeBorder: 'border-rose-500/30',
      tagBadge: 'bg-rose-950/60 text-rose-400 border-rose-500/30 hover:border-rose-400',
      focusRing: 'focus:border-rose-500'
    }
  }[colorTheme];

  // Filter unselected suggestions
  const unselectedOptions = availableOptions.filter(
    (opt) => !cleanSelected.some((s) => s.toLowerCase() === opt.toLowerCase())
  );

  const visibleSuggestions = showAllSuggestions ? unselectedOptions : unselectedOptions.slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">{label}</label>
        <span className="text-[10px] text-slate-500">
          {cleanSelected.length} selected
        </span>
      </div>

      {/* Selected Active Pills + Input Box Container */}
      <div className={`w-full min-h-[42px] p-2 bg-slate-900 border border-slate-700/80 rounded-xl flex flex-wrap items-center gap-1.5 ${themeStyles.focusRing}`}>
        {cleanSelected.map((val) => (
          <span
            key={val}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border shadow-xs transition-all ${themeStyles.activeBadge}`}
          >
            <span>{val}</span>
            {badgeSuffix && <span className="opacity-60 text-[10px]">{badgeSuffix}</span>}
            <button
              type="button"
              onClick={(e) => handleRemove(val, e)}
              className="hover:opacity-75 transition-opacity p-0.5 rounded"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Inline Input for custom addition */}
        <div className="inline-flex items-center gap-1 flex-1 min-w-[120px]">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleAddCustom}
            placeholder={cleanSelected.length === 0 ? placeholder : '+ add more...'}
            className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none px-1 py-0.5"
          />
          {customInput.trim() && (
            <button
              type="button"
              onClick={handleAddCustomClick}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 shrink-0"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>
      </div>

      {/* Unselected Suggestion Cloud */}
      {visibleSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">
            Suggestions:
          </span>
          {visibleSuggestions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleToggle(opt)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/40 transition-all"
            >
              <Plus className="h-2.5 w-2.5 opacity-60" />
              <span>{opt}</span>
            </button>
          ))}

          {unselectedOptions.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
              className="text-[10px] text-slate-400 hover:text-white underline px-1 py-0.5"
            >
              {showAllSuggestions ? 'Show less' : `+${unselectedOptions.length - 10} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
