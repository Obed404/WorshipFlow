import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const INSTRUMENT_LABELS: Record<string, string> = {
  GUITAR: 'Guitar',
  PIANO: 'Piano',
  UKULELE: 'Ukulele',
  BASS: 'Bass',
  MANDOLIN: 'Mandolin',
  OTHER: 'Other',
};
