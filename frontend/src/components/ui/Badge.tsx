import React from 'react';
import { cn } from '../../lib/utils.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string;
  variant?: 'solid' | 'subtle' | 'outline';
}

function getTailwindColorClasses(hex?: string, variant: 'solid' | 'subtle' | 'outline' = 'subtle'): string {
  const normalized = hex?.toLowerCase();

  switch (normalized) {
    case '#198754':
    case '#146c43':
    case '#16804a':
      return variant === 'solid'
        ? 'bg-[#198754] text-white'
        : variant === 'outline'
        ? 'border border-[#198754]/40 dark:border-[#6FCF97]/40 text-[#146C43] dark:text-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C]/50'
        : 'bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#F0F5F0]';
    case '#ef4444':
    case '#dc2626':
    case '#d92d20':
      return variant === 'solid'
        ? 'bg-red-600 text-white'
        : variant === 'outline'
        ? 'border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40'
        : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300';
    case '#10b981':
    case '#059669':
      return variant === 'solid'
        ? 'bg-emerald-600 text-white'
        : variant === 'outline'
        ? 'border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300';
    case '#f59e0b':
    case '#d97706':
    case '#a16207':
      return variant === 'solid'
        ? 'bg-amber-600 text-white'
        : variant === 'outline'
        ? 'border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';
    case '#8b5cf6':
    case '#7c3aed':
      return variant === 'solid'
        ? 'bg-purple-600 text-white'
        : variant === 'outline'
        ? 'border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40'
        : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300';
    case '#6366f1':
    case '#4f46e5':
      return variant === 'solid'
        ? 'bg-indigo-600 text-white'
        : variant === 'outline'
        ? 'border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40'
        : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300';
    case '#e11d48':
    case '#f43f5e':
      return variant === 'solid'
        ? 'bg-rose-600 text-white'
        : variant === 'outline'
        ? 'border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300';
    case '#06b6d4':
      return variant === 'solid'
        ? 'bg-cyan-600 text-white'
        : variant === 'outline'
        ? 'border border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40'
        : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300';
    case '#3b82f6':
    case '#2563eb':
    case '#1d4ed8':
      return variant === 'solid'
        ? 'bg-blue-600 text-white'
        : variant === 'outline'
        ? 'border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40'
        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300';
    default:
      return variant === 'solid'
        ? 'bg-[#198754] text-white'
        : variant === 'outline'
        ? 'border border-[#E4E9E3] dark:border-[#2A4033] text-[#146C43] dark:text-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C]/40'
        : 'bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#F0F5F0]';
  }
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color,
  variant = 'subtle',
  className,
  ...props
}) => {
  const colorClasses = getTailwindColorClasses(color, variant);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide select-none',
        colorClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
