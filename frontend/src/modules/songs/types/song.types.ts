import type { Label } from '../../labels/types/label.types.js';

export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Song {
  id: number;
  title: string;
  artist: string | null;
  songKey: string | null;
  capo: number;
  tempo: number | null;
  difficulty: Difficulty;
  content: string;
  contentJson?: any;
  sections?: any[];
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
  difficulty?: Difficulty;
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
  difficulty?: Difficulty;
  content?: string;
  notes?: string | null;
  labelIds?: number[];
}

export interface SongQueryParams {
  search?: string;
  labelIds?: string;
  difficulty?: Difficulty | '';
  sort?: 'title' | 'artist' | 'created_at' | 'updated_at';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}
