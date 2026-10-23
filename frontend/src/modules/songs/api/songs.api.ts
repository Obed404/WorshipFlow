import { apiClient } from '../../../lib/api.js';
import type { ApiResponse } from '../../../types/api.types.js';
import type {
  Song,
  CreateSongInput,
  UpdateSongInput,
  SongQueryParams,
} from '../types/song.types.js';
import {
  saveSongOffline,
  saveSongsOffline,
  getSongOffline,
  getAllSongsOffline,
} from '../../../lib/offline/worshipflow_db.js';

export async function getSongs(params?: SongQueryParams): Promise<Song[]> {
  try {
    const response = await apiClient.get<ApiResponse<Song[]>>('/songs', { params });
    const songs = response.data.data;
    // Cache for offline usage in background
    saveSongsOffline(songs).catch(() => {});
    return songs;
  } catch (error) {
    // If network fails or user is offline, fall back to IndexedDB
    try {
      const offlineSongs = await getAllSongsOffline();
      if (offlineSongs.length > 0) {
        let filtered = offlineSongs;
        if (params?.search) {
          const q = params.search.toLowerCase();
          filtered = filtered.filter(
            (s) => s.title.toLowerCase().includes(q) || (s.artist && s.artist.toLowerCase().includes(q))
          );
        }
        if (params?.difficulty) {
          filtered = filtered.filter((s) => s.difficulty === params.difficulty);
        }
        return filtered;
      }
    } catch {
      // Fall through to throw original error
    }
    throw error;
  }
}

export async function getSongById(id: number): Promise<Song> {
  try {
    const response = await apiClient.get<ApiResponse<Song>>(`/songs/${id}`);
    const song = response.data.data;
    saveSongOffline(song).catch(() => {});
    return song;
  } catch (error) {
    try {
      const offlineSong = await getSongOffline(id);
      if (offlineSong) {
        return offlineSong;
      }
    } catch {
      // Fall through
    }
    throw error;
  }
}

export async function createSong(input: CreateSongInput): Promise<Song> {
  const response = await apiClient.post<ApiResponse<Song>>('/songs', input);
  const created = response.data.data;
  saveSongOffline(created).catch(() => {});
  return created;
}

export async function updateSong(id: number, input: UpdateSongInput): Promise<Song> {
  const response = await apiClient.put<ApiResponse<Song>>(`/songs/${id}`, input);
  const updated = response.data.data;
  saveSongOffline(updated).catch(() => {});
  return updated;
}

export async function deleteSong(id: number): Promise<void> {
  await apiClient.delete(`/songs/${id}`);
}

/**
 * Export song in WorshipFlow JSON document format and trigger download
 */
export async function exportSongJson(id: number, songTitle: string): Promise<void> {
  const response = await apiClient.get(`/songs/${id}/export`);
  const data = response.data;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = songTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'song';
  link.href = url;
  link.download = `${safeTitle}.worshipflow`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import single or batch songs
 */
export async function importSongsApi(
  payload: any,
  conflictMode: 'skip' | 'overwrite' | 'keep_both' = 'keep_both'
): Promise<any> {
  const response = await apiClient.post<ApiResponse<any>>('/songs/import', {
    ...payload,
    conflictMode,
  });
  return response.data.data;
}
