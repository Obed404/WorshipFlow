import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId && error ? `${inputId}-error` : undefined;
    const helperId = inputId && helperText && !error ? `${inputId}-helper` : undefined;
    const describedBy = errorId || helperId || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm shadow-xs transition-colors',
            'bg-white dark:bg-[#17251E]',
            'text-[#1C2924] dark:text-[#F0F5F0]',
            'placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE]',
            'focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97] focus:border-[#198754] dark:focus:border-[#6FCF97]',
            'disabled:bg-[#E8F1E9]/50 dark:disabled:bg-[#24372C]/50 disabled:text-[#647067] dark:disabled:text-[#A8B9AE] disabled:border-[#E4E9E3] dark:disabled:border-[#2A4033]',
            error
              ? 'border-red-300 dark:border-red-700 text-[#D92D20] dark:text-[#F87171] focus:border-[#D92D20] focus:ring-[#D92D20]'
              : 'border-[#E4E9E3] dark:border-[#2A4033] hover:border-[#198754]/50 dark:hover:border-[#6FCF97]/50',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-xs text-[#D92D20] dark:text-[#F87171]">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-xs text-[#647067] dark:text-[#A8B9AE]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
