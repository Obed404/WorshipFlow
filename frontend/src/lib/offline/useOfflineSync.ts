import { useState, useEffect, useCallback } from 'react';
import {
  saveSongsOffline,
  saveLabelsOffline,
  saveSetlistsOffline,
  getOfflineStats,
  clearOfflineData,
} from './worshipflow_db.js';
import { getSongs } from '../../modules/songs/api/songs.api.js';
import { getLabels } from '../../modules/labels/api/labels.api.js';
import { getSetlists } from '../../modules/setlists/api/setlists.api.js';

export interface OfflineStats {
  songCount: number;
  setlistCount: number;
  labelCount: number;
  lastSyncedAt: string | null;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [stats, setStats] = useState<OfflineStats>({
    songCount: 0,
    setlistCount: 0,
    labelCount: 0,
    lastSyncedAt: null,
  });

  const refreshStats = useCallback(async () => {
    try {
      const currentStats = await getOfflineStats();
      setStats(currentStats);
    } catch (err) {
      console.warn('Failed to load offline stats:', err);
    }
  }, []);

  useEffect(() => {
    refreshStats();

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshStats]);

  const syncOfflineLibrary = useCallback(async () => {
    if (!isOnline) {
      setSyncError('Cannot synchronize while offline');
      return false;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const [songs, labels, setlists] = await Promise.all([
        getSongs({ limit: 1000 }),
        getLabels(),
        getSetlists(),
      ]);

      await Promise.all([
        saveSongsOffline(songs),
        saveLabelsOffline(labels),
        saveSetlistsOffline(setlists),
      ]);

      await refreshStats();
      return true;
    } catch (error: any) {
      console.error('Offline synchronization error:', error);
      setSyncError(error?.message || 'Failed to sync library for offline use');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, refreshStats]);

  const clearCache = useCallback(async () => {
    try {
      await clearOfflineData();
      await refreshStats();
    } catch (err) {
      console.error('Failed to clear offline storage:', err);
    }
  }, [refreshStats]);

  return {
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    syncError,
    stats,
    syncOfflineLibrary,
    clearCache,
    refreshStats,
  };
}
