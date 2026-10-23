import React, { useEffect } from 'react';
import { cn } from '../../lib/utils.js';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby={description ? "modal-description" : undefined}
          className={cn(
            'relative transform overflow-hidden rounded-2xl text-left shadow-2xl transition-all sm:my-8 w-full p-5 sm:p-6 max-h-[90vh] flex flex-col',
            'bg-white dark:bg-[#17251E]',
            'border border-[#E4E9E3] dark:border-[#2A4033]',
            maxWidthClasses[maxWidth],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-[#E4E9E3] dark:border-[#2A4033] shrink-0">
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-[#1C2924] dark:text-[#F0F5F0]">{title}</h3>
              {description && (
                <p id="modal-description" className="text-sm text-[#647067] dark:text-[#A8B9AE] mt-1">{description}</p>
              )}
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="pt-4 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
};
