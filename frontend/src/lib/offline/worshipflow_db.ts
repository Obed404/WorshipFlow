import type { Song } from '../../modules/songs/types/song.types.js';

const DB_NAME = 'worshipflow-offline';
const DB_VERSION = 1;

export interface OfflineMeta {
  key: string;
  value: any;
  updatedAt: string;
}

/**
 * Opens or initializes the native browser IndexedDB database for WorshipFlow offline storage.
 */
export function openWorshipFlowDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('songs')) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id' });
        songStore.createIndex('title', 'title', { unique: false });
        songStore.createIndex('artist', 'artist', { unique: false });
      }

      if (!db.objectStoreNames.contains('setlists')) {
        const setlistStore = db.createObjectStore('setlists', { keyPath: 'id' });
        setlistStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('labels')) {
        const labelStore = db.createObjectStore('labels', { keyPath: 'id' });
        labelStore.createIndex('name', 'name', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------------------------------------------------------------
// Song Operations
// ----------------------------------------------------------------------

export async function saveSongOffline(song: Song): Promise<void> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['songs', 'meta'], 'readwrite');
    const store = tx.objectStore('songs');
    const metaStore = tx.objectStore('meta');

    store.put(song);
    metaStore.put({
      key: 'last_sync',
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveSongsOffline(songs: Song[]): Promise<void> {
  if (!songs || songs.length === 0) return;
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['songs', 'meta'], 'readwrite');
    const store = tx.objectStore('songs');
    const metaStore = tx.objectStore('meta');

    for (const song of songs) {
      store.put(song);
    }

    metaStore.put({
      key: 'last_sync',
      value: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSongOffline(id: number): Promise<Song | null> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSongsOffline(): Promise<Song[]> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------------------------
// Setlist Operations
// ----------------------------------------------------------------------

export async function saveSetlistOffline(setlist: any): Promise<void> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('setlists', 'readwrite');
    const store = tx.objectStore('setlists');
    store.put(setlist);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveSetlistsOffline(setlists: any[]): Promise<void> {
  if (!setlists || setlists.length === 0) return;
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('setlists', 'readwrite');
    const store = tx.objectStore('setlists');

    for (const st of setlists) {
      store.put(st);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSetlistOffline(id: number): Promise<any | null> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('setlists', 'readonly');
    const store = tx.objectStore('setlists');
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSetlistsOffline(): Promise<any[]> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('setlists', 'readonly');
    const store = tx.objectStore('setlists');
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------------------------
// Label Operations
// ----------------------------------------------------------------------

export async function saveLabelsOffline(labels: any[]): Promise<void> {
  if (!labels || labels.length === 0) return;
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('labels', 'readwrite');
    const store = tx.objectStore('labels');

    for (const lbl of labels) {
      store.put(lbl);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllLabelsOffline(): Promise<any[]> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('labels', 'readonly');
    const store = tx.objectStore('labels');
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ----------------------------------------------------------------------
// Metadata and Utility
// ----------------------------------------------------------------------

export async function getOfflineStats(): Promise<{
  songCount: number;
  setlistCount: number;
  labelCount: number;
  lastSyncedAt: string | null;
}> {
  try {
    const db = await openWorshipFlowDB();
    const [songs, setlists, labels, meta] = await Promise.all([
      new Promise<number>((res) => {
        const tx = db.transaction('songs', 'readonly');
        const req = tx.objectStore('songs').count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      }),
      new Promise<number>((res) => {
        const tx = db.transaction('setlists', 'readonly');
        const req = tx.objectStore('setlists').count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      }),
      new Promise<number>((res) => {
        const tx = db.transaction('labels', 'readonly');
        const req = tx.objectStore('labels').count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      }),
      new Promise<string | null>((res) => {
        const tx = db.transaction('meta', 'readonly');
        const req = tx.objectStore('meta').get('last_sync');
        req.onsuccess = () => res(req.result ? req.result.value : null);
        req.onerror = () => res(null);
      }),
    ]);

    return {
      songCount: songs,
      setlistCount: setlists,
      labelCount: labels,
      lastSyncedAt: meta,
    };
  } catch {
    return { songCount: 0, setlistCount: 0, labelCount: 0, lastSyncedAt: null };
  }
}

export async function clearOfflineData(): Promise<void> {
  const db = await openWorshipFlowDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['songs', 'setlists', 'labels', 'meta'], 'readwrite');
    tx.objectStore('songs').clear();
    tx.objectStore('setlists').clear();
    tx.objectStore('labels').clear();
    tx.objectStore('meta').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
