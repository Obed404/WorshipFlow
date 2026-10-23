import React from 'react';
import { cn } from '../../lib/utils.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none focus:ring-offset-white dark:focus:ring-offset-[#101A16]';

  const variants = {
    primary:
      'bg-[#198754] text-white hover:bg-[#146C43] dark:bg-[#198754] dark:hover:bg-[#239B60] dark:text-white focus:ring-[#198754] dark:focus:ring-[#6FCF97] shadow-xs',
    secondary:
      'bg-[#E8F1E9] text-[#146C43] hover:bg-[#d8e7da] dark:bg-[#24372C] dark:text-[#F0F5F0] dark:hover:bg-[#2f4639] focus:ring-[#198754] dark:focus:ring-[#6FCF97]',
    outline:
      'border border-[#E4E9E3] bg-white text-[#1C2924] hover:bg-[#E8F1E9] hover:text-[#146C43] hover:border-[#198754]/40 dark:border-[#2A4033] dark:bg-transparent dark:text-[#F0F5F0] dark:hover:bg-[#24372C] dark:hover:border-[#6FCF97]/40 focus:ring-[#198754] dark:focus:ring-[#6FCF97] shadow-xs',
    danger:
      'bg-[#D92D20] text-white hover:bg-[#b92419] dark:bg-[#D92D20] dark:hover:bg-[#ef4444] dark:text-white focus:ring-[#D92D20] dark:focus:ring-[#F87171] shadow-xs',
    ghost:
      'text-[#647067] hover:bg-[#E8F1E9] hover:text-[#1C2924] dark:text-[#A8B9AE] dark:hover:bg-[#24372C] dark:hover:text-[#F0F5F0] focus:ring-[#198754] dark:focus:ring-[#6FCF97]',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
