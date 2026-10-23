import { z } from 'zod';

// Database types
export interface LabelRow {
  id: number;
  name: string;
  color: string;
  instrument: 'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER' | null;
  created_at: Date | string;
}

export interface LabelWithCountRow extends LabelRow {
  song_count: number;
}

// API types
export interface Label {
  id: number;
  name: string;
  color: string;
  instrument: 'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER' | null;
  createdAt: string;
}

export interface LabelWithCount extends Label {
  songCount: number;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
  instrument?: 'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER' | null;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
  instrument?: 'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER' | null;
}

export interface LabelQueryParams {
  search?: string;
  instrument?: 'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER';
  sort?: 'name' | 'created_at' | 'song_count';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// Validation schemas
export const createLabelSchema = z.object({
  name: z.string()
    .min(1, 'Label name is required')
    .max(100, 'Label name must be 100 characters or less')
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Label name can only contain letters, numbers, spaces, and hyphens'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #3b82f6)')
    .optional()
    .default('#3b82f6'),
  instrument: z.enum(['GUITAR', 'PIANO', 'UKULELE', 'BASS', 'MANDOLIN', 'OTHER'])
    .nullable()
    .optional()
    .default(null),
});

export const updateLabelSchema = z.object({
  name: z.string()
    .min(1, 'Label name is required')
    .max(100, 'Label name must be 100 characters or less')
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Label name can only contain letters, numbers, spaces, and hyphens')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #3b82f6)')
    .optional(),
  instrument: z.enum(['GUITAR', 'PIANO', 'UKULELE', 'BASS', 'MANDOLIN', 'OTHER'])
    .nullable()
    .optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const labelQuerySchema = z.object({
  search: z.string().optional(),
  instrument: z.enum(['GUITAR', 'PIANO', 'UKULELE', 'BASS', 'MANDOLIN', 'OTHER']).optional(),
  sort: z.enum(['name', 'created_at', 'song_count']).optional().default('name'),
  order: z.enum(['ASC', 'DESC']).optional().default('ASC'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Type inference
export type CreateLabelData = z.infer<typeof createLabelSchema>;
export type UpdateLabelData = z.infer<typeof updateLabelSchema>;
export type LabelQueryData = z.infer<typeof labelQuerySchema>;

// Helper functions
function formatDbDate(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return String(date);
}

export function mapLabelRowToLabel(row: LabelRow): Label {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    instrument: row.instrument,
    createdAt: formatDbDate(row.created_at),
  };
}

export function mapLabelWithCountRowToLabel(row: LabelWithCountRow): LabelWithCount {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    instrument: row.instrument,
    createdAt: formatDbDate(row.created_at),
    songCount: Number(row.song_count || 0),
  };
}

export function validateColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export const INSTRUMENT_OPTIONS = [
  { value: 'GUITAR', label: 'Guitar' },
  { value: 'PIANO', label: 'Piano' },
  { value: 'UKULELE', label: 'Ukulele' },
  { value: 'BASS', label: 'Bass' },
  { value: 'MANDOLIN', label: 'Mandolin' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
];