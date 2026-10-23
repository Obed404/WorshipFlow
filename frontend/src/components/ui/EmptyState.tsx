import React from 'react';
import { cn } from '../../lib/utils.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl my-6',
        'border-2 border-dashed border-[#E4E9E3] dark:border-[#2A4033]',
        'bg-white/60 dark:bg-[#17251E]/60',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[#146C43] dark:text-[#6FCF97] p-3 bg-[#E8F1E9] dark:bg-[#24372C] rounded-2xl shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0] mb-1">{title}</h3>
      <p className="text-sm text-[#647067] dark:text-[#A8B9AE] max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
