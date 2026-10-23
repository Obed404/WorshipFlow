import { z } from 'zod';
import type { Label } from '../../labels/types/label.types.js';
import type { WorshipFlowSection } from './worshipflow_song.types.js';

// Database types
export interface SongRow {
  id: number;
  title: string;
  artist: string | null;
  song_key: string | null;
  capo: number;
  tempo: number | null;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  content: string;
  content_json?: string | object | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SongLabelRow {
  song_id: number;
  label_id: number;
}

export interface SongWithLabelsRow extends SongRow {
  label_ids: string | null;
  label_names: string | null;
}

// API types
export interface Song {
  id: number;
  title: string;
  artist: string | null;
  songKey: string | null;
  capo: number;
  tempo: number | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  content: string;
  contentJson?: any;
  sections?: WorshipFlowSection[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  labels: Label[];
}

export interface CreateSongInput {
  title: string;
  artist?: string | null;
  songKey?: string | null;
  capo?: number;
  tempo?: number | null;
  content: string;
  notes?: string | null;
  labelIds?: number[];
}

export interface UpdateSongInput {
  title?: string;
  artist?: string | null;
  songKey?: string | null;
  capo?: number;
  tempo?: number | null;
  content?: string;
  notes?: string | null;
  labelIds?: number[];
}

export interface SongQueryParams {
  search?: string;
  labelIds?: string;
  sort?: 'title' | 'artist' | 'created_at' | 'updated_at';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// Validation schemas
export const createSongSchema = z.object({
  title: z.string()
    .min(1, 'Song title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim(),
  artist: z.string()
    .max(255, 'Artist must be 255 characters or less')
    .trim()
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  songKey: z.string()
    .max(10, 'Song key must be 10 characters or less')
    .trim()
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  capo: z.coerce.number()
    .int('Capo must be an integer')
    .min(0, 'Capo cannot be negative')
    .max(12, 'Capo cannot be greater than 12')
    .default(0),
  tempo: z.coerce.number()
    .int('Tempo must be an integer')
    .min(20, 'Tempo must be at least 20 BPM')
    .max(300, 'Tempo cannot exceed 300 BPM')
    .nullable()
    .optional()
    .transform(val => isNaN(val as number) || val === 0 ? null : val),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  content: z.string()
    .min(1, 'Song content (lyrics/chords) is required'),
  notes: z.string()
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  labelIds: z.array(z.coerce.number().int().positive())
    .optional()
    .default([]),
});

export const updateSongSchema = z.object({
  title: z.string()
    .min(1, 'Song title cannot be empty')
    .max(255, 'Title must be 255 characters or less')
    .trim()
    .optional(),
  artist: z.string()
    .max(255, 'Artist must be 255 characters or less')
    .trim()
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  songKey: z.string()
    .max(10, 'Song key must be 10 characters or less')
    .trim()
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  capo: z.coerce.number()
    .int('Capo must be an integer')
    .min(0, 'Capo cannot be negative')
    .max(12, 'Capo cannot be greater than 12')
    .optional(),
  tempo: z.coerce.number()
    .int('Tempo must be an integer')
    .min(20, 'Tempo must be at least 20 BPM')
    .max(300, 'Tempo cannot exceed 300 BPM')
    .nullable()
    .optional()
    .transform(val => isNaN(val as number) || val === 0 ? null : val),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  content: z.string()
    .min(1, 'Song content cannot be empty')
    .optional(),
  notes: z.string()
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val),
  labelIds: z.array(z.coerce.number().int().positive())
    .optional(),
});

export const songQuerySchema = z.object({
  search: z.string().trim().optional(),
  labelIds: z.string()
    .trim()
    .optional()
    .transform(val => {
      if (!val) return [];
      return val.split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id) && id > 0);
    }),
  sort: z.enum(['title', 'artist', 'created_at', 'updated_at']).default('updated_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSongData = z.infer<typeof createSongSchema>;
export type UpdateSongData = z.infer<typeof updateSongSchema>;
export type SongQueryData = z.infer<typeof songQuerySchema>;

// Helpers to map DB row to API response
function formatSongDate(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return String(date);
}

export function mapSongRowToSong(row: SongRow, labels: Label[] = []): Song {
  let contentJson: any = null;
  let sections: WorshipFlowSection[] | undefined = undefined;

  if (row.content_json) {
    try {
      contentJson = typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json;
      if (contentJson && Array.isArray(contentJson.sections)) {
        sections = contentJson.sections;
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    songKey: row.song_key,
    capo: row.capo,
    tempo: row.tempo,
    difficulty: row.difficulty || 'BEGINNER',
    content: row.content,
    contentJson: contentJson || undefined,
    sections,
    notes: row.notes,
    createdAt: formatSongDate(row.created_at),
    updatedAt: formatSongDate(row.updated_at),
    labels,
  };
}
