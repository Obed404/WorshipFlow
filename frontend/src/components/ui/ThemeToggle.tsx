import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../context/ThemeContext.js';
import { cn } from '../../lib/utils.js';

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel = false }) => {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4 text-[#198754] dark:text-[#6FCF97]" /> },
    { value: 'system', label: 'System', icon: <Laptop className="w-4 h-4 text-[#647067] dark:text-[#A8B9AE]" /> },
  ];

  const currentIcon =
    theme === 'system' ? (
      <Laptop className="w-4 h-4 text-[#647067] dark:text-[#A8B9AE]" />
    ) : effectiveTheme === 'dark' ? (
      <Moon className="w-4 h-4 text-[#198754] dark:text-[#6FCF97]" />
    ) : (
      <Sun className="w-4 h-4 text-amber-500" />
    );

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Theme: ${theme}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none',
          'border border-[#E4E9E3] dark:border-[#2A4033] bg-white dark:bg-[#17251E]',
          'text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C]',
          'focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97]'
        )}
      >
        {currentIcon}
        {showLabel && (
          <span className="capitalize text-[#647067] dark:text-[#A8B9AE]">
            {theme}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1.5 z-50 w-36 rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] bg-white dark:bg-[#17251E] p-1 shadow-lg ring-1 ring-black/5 dark:ring-white/5 focus:outline-none"
        >
          {options.map((opt) => {
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors',
                  isSelected
                    ? 'bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#F0F5F0] font-semibold'
                    : 'text-[#1C2924] dark:text-[#A8B9AE] hover:bg-[#E8F1E9]/60 dark:hover:bg-[#24372C]/60 hover:text-[#146C43] dark:hover:text-[#F0F5F0]'
                )}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#146C43] dark:text-[#6FCF97]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
