import { z } from 'zod';
import type { Song } from '../../songs/types/song.types.js';

export interface SetlistSongItem {
  song: Song;
  position: number;
  transposeOffset: number;
}

export interface Setlist {
  id: number;
  name: string;
  description: string | null;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SetlistWithSongs extends Setlist {
  songs: SetlistSongItem[];
}

export const createSetlistSchema = z.object({
  name: z.string().min(1, 'Setlist name is required').max(255).trim(),
  description: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
});

export const updateSetlistSchema = z.object({
  name: z.string().min(1, 'Setlist name cannot be empty').max(255).trim().optional(),
  description: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
});

export const addSongToSetlistSchema = z.object({
  songId: z.coerce.number().int().positive(),
  position: z.coerce.number().int().min(0).optional(),
  transposeOffset: z.coerce.number().int().default(0),
});

export const reorderSetlistSchema = z.object({
  songIds: z.array(z.coerce.number().int().positive()),
});

export type CreateSetlistData = z.infer<typeof createSetlistSchema>;
export type UpdateSetlistData = z.infer<typeof updateSetlistSchema>;
export type AddSongToSetlistData = z.infer<typeof addSongToSetlistSchema>;
export type ReorderSetlistData = z.infer<typeof reorderSetlistSchema>;
