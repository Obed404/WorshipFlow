import api from '../../../lib/api.js';
import type { Song } from '../../songs/types/song.types.js';
import {
  saveSetlistsOffline,
  saveSetlistOffline,
  getAllSetlistsOffline,
  getSetlistOffline,
} from '../../../lib/offline/worshipflow_db.js';

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

export async function getSetlists(): Promise<Setlist[]> {
  try {
    const res = await api.get('/setlists');
    const data = res.data.data;
    saveSetlistsOffline(data).catch(() => {});
    return data;
  } catch (error) {
    try {
      const offline = await getAllSetlistsOffline();
      if (offline.length > 0) return offline;
    } catch {
      // Fall through
    }
    throw error;
  }
}

export async function getSetlistById(id: number): Promise<SetlistWithSongs> {
  try {
    const res = await api.get(`/setlists/${id}`);
    const data = res.data.data;
    saveSetlistOffline(data).catch(() => {});
    return data;
  } catch (error) {
    try {
      const offline = await getSetlistOffline(id);
      if (offline) return offline;
    } catch {
      // Fall through
    }
    throw error;
  }
}

export async function createSetlist(data: { name: string; description?: string | null }): Promise<Setlist> {
  const res = await api.post('/setlists', data);
  const created = res.data.data;
  saveSetlistOffline(created).catch(() => {});
  return created;
}

export async function updateSetlist(
  id: number,
  data: { name?: string; description?: string | null }
): Promise<Setlist> {
  const res = await api.put(`/setlists/${id}`, data);
  const updated = res.data.data;
  saveSetlistOffline(updated).catch(() => {});
  return updated;
}

export async function deleteSetlist(id: number): Promise<void> {
  await api.delete(`/setlists/${id}`);
}

export async function addSongToSetlist(
  setlistId: number,
  songId: number,
  transposeOffset: number = 0
): Promise<SetlistWithSongs> {
  const res = await api.post(`/setlists/${setlistId}/songs`, { songId, transposeOffset });
  const updated = res.data.data;
  saveSetlistOffline(updated).catch(() => {});
  return updated;
}

export async function removeSongFromSetlist(setlistId: number, songId: number): Promise<SetlistWithSongs> {
  const res = await api.delete(`/setlists/${setlistId}/songs/${songId}`);
  const updated = res.data.data;
  saveSetlistOffline(updated).catch(() => {});
  return updated;
}

export async function reorderSetlistSongs(
  setlistId: number,
  songIds: number[]
): Promise<SetlistWithSongs> {
  const res = await api.put(`/setlists/${setlistId}/songs/reorder`, { songIds });
  const updated = res.data.data;
  saveSetlistOffline(updated).catch(() => {});
  return updated;
}
