import React, { useState, useRef } from 'react';
import {
  Wifi,
  Download,
  Upload,
  Moon,
  Sun,
  Laptop,
  Check,
  AlertCircle,
  Copy,
  CheckCheck,
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext.js';
import { Button } from '../../../components/ui/Button.js';
import { useOfflineSync } from '../../../lib/offline/useOfflineSync.js';
import api from '../../../lib/api.js';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const {
    isOffline,
    isSyncing,
    syncError,
    stats,
    syncOfflineLibrary,
    clearCache,
  } = useOfflineSync();

  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive current host LAN address or fallback
  const lanHost = window.location.hostname;
  const lanUrl = `http://${lanHost}:${window.location.port || '5173'}`;

  const handleCopyLan = () => {
    navigator.clipboard.writeText(lanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setBackupMessage(null);
      const res = await api.get('/backup');
      const dataStr = JSON.stringify(res.data.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `worshipflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupMessage({ text: 'WorshipFlow library exported successfully.' });
    } catch (err: any) {
      setBackupMessage({ text: err.message || 'Failed to export backup', error: true });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setBackupMessage(null);
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || !Array.isArray(parsed.songs)) {
        throw new Error('Invalid JSON format: must contain a "songs" array');
      }

      const res = await api.post('/backup/restore', parsed);
      setBackupMessage({
        text: res.data.message || 'WorshipFlow library restored successfully!',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setBackupMessage({
        text: `Restore failed: ${err.message || 'Invalid backup file'}`,
        error: true,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight flex items-center gap-2">
            <span>WorshipFlow Settings</span>
          </h1>
          <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mt-1">
            Every song. Every moment. One flow. Manage storage, offline sync, appearance, and LAN access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <CloudOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#4ADE80] border border-[#198754]/30">
              <Cloud className="w-3.5 h-3.5" />
              <span>Connected Online</span>
            </span>
          )}
        </div>
      </div>

      {/* Message alert */}
      {backupMessage && (
        <div
          className={`w-full p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            backupMessage.error
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-[#D92D20] dark:text-[#F87171]'
              : 'bg-[#E8F1E9] dark:bg-[#24372C] border border-[#198754]/30 dark:border-[#6FCF97]/30 text-[#146C43] dark:text-[#4ADE80]'
          }`}
        >
          {backupMessage.error ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20] dark:text-[#F87171]" />
          ) : (
            <Check className="w-4 h-4 shrink-0 text-[#146C43] dark:text-[#4ADE80]" />
          )}
          <span>{backupMessage.text}</span>
        </div>
      )}

      {/* Settings Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* 1. Offline Mode & IndexedDB Cache */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            <Cloud className="w-5 h-5 text-[#198754] dark:text-[#6FCF97]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0]">
                Offline Storage &amp; Live Sync
              </h2>
              <p className="text-xs text-[#647067] dark:text-[#A8B9AE]">
                View and perform songs even without an internet or server connection.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-[#FAFAF6] dark:bg-[#101A16] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] text-center">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] block">
                Songs Cached
              </span>
              <span className="text-lg font-bold text-[#146C43] dark:text-[#6FCF97]">
                {stats.songCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] block">
                Setlists
              </span>
              <span className="text-lg font-bold text-[#146C43] dark:text-[#6FCF97]">
                {stats.setlistCount}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] block">
                Labels
              </span>
              <span className="text-lg font-bold text-[#146C43] dark:text-[#6FCF97]">
                {stats.labelCount}
              </span>
            </div>
          </div>

          {stats.lastSyncedAt && (
            <p className="text-[11px] text-[#647067] dark:text-[#A8B9AE]">
              Last synced to browser storage: {new Date(stats.lastSyncedAt).toLocaleString()}
            </p>
          )}

          {syncError && (
            <p className="text-xs text-[#D92D20] dark:text-[#F87171]">{syncError}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={syncOfflineLibrary}
              isLoading={isSyncing}
              disabled={isOffline}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              <span>Sync Library for Offline Use</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCache}
              disabled={stats.songCount === 0}
            >
              <Trash2 className="w-4 h-4 mr-1.5 text-[#D92D20]" />
              <span>Clear Cache</span>
            </Button>
          </div>
        </div>

        {/* 2. Database & Data Architecture */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            <Database className="w-5 h-5 text-[#198754] dark:text-[#6FCF97]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0]">
                Data Architecture &amp; Database
              </h2>
              <p className="text-xs text-[#647067] dark:text-[#A8B9AE]">
                Central MySQL database with structured JSON and chord sheet storage.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#FAFAF6] dark:bg-[#101A16] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#647067] dark:text-[#A8B9AE]">Database Name:</span>
              <span className="font-mono font-bold text-[#146C43] dark:text-[#6FCF97]">worshipflow</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#647067] dark:text-[#A8B9AE]">Charset &amp; Collation:</span>
              <span className="font-mono">utf8mb4_unicode_ci</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#647067] dark:text-[#A8B9AE]">Song Storage Format:</span>
              <span className="font-mono font-bold text-[#146C43] dark:text-[#6FCF97]">worshipflow-song (v1 JSON) + raw chords</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#647067] dark:text-[#A8B9AE]">Database Port:</span>
              <span className="font-mono">3307</span>
            </div>
          </div>

          <p className="text-xs text-[#647067] dark:text-[#A8B9AE] leading-relaxed">
            All songs preserve raw bracket notation <code className="font-mono text-[#146C43] dark:text-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C] px-1 py-0.5 rounded">[Chord]lyric</code> alongside structured section JSON for 100% backward compatibility.
          </p>
        </div>

        {/* 3. LAN Access Card */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            <Wifi className="w-5 h-5 text-[#198754] dark:text-[#6FCF97]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0]">
                Local Network Access (LAN)
              </h2>
              <p className="text-xs text-[#647067] dark:text-[#A8B9AE]">
                Access WorshipFlow from your iPad, Android tablet, phone, or laptop on the same Wi-Fi.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#FAFAF6] dark:bg-[#101A16] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033]">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A8B9AE] block">
                Network URL
              </span>
              <span className="font-mono text-sm font-bold text-[#146C43] dark:text-[#6FCF97] select-all truncate block">
                {lanUrl}
              </span>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={handleCopyLan}>
              {copied ? <CheckCheck className="w-4 h-4 text-[#198754] dark:text-[#6FCF97]" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </Button>
          </div>

          <p className="text-xs text-[#647067] dark:text-[#A8B9AE] leading-relaxed">
            The frontend and Express backend are bound to <code className="font-mono text-[#146C43] dark:text-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C] px-1 py-0.5 rounded">0.0.0.0</code>.
          </p>
        </div>

        {/* 4. Appearance Theme Card */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0] border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            Appearance Theme
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Forest Green (Light)', icon: <Sun className="w-4 h-4 text-amber-500" /> },
              { id: 'dark', label: 'Dark Forest', icon: <Moon className="w-4 h-4 text-[#198754] dark:text-[#6FCF97]" /> },
              { id: 'system', label: 'System', icon: <Laptop className="w-4 h-4 text-[#647067] dark:text-[#A8B9AE]" /> },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id as any)}
                className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                  theme === item.id
                    ? 'border-[#198754] dark:border-[#6FCF97] bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#F0F5F0] ring-1 ring-[#198754] dark:ring-[#6FCF97]'
                    : 'border-[#E4E9E3] dark:border-[#2A4033] text-[#1C2924] dark:text-[#F0F5F0] hover:bg-[#E8F1E9]/60 dark:hover:bg-[#24372C]/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {theme === item.id && <Check className="w-4 h-4 text-[#146C43] dark:text-[#6FCF97]" />}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Backup & Restore Card */}
        <div className="lg:col-span-2 w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0] border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            WorshipFlow Library Backup &amp; Restore
          </h2>

          <p className="text-xs text-[#647067] dark:text-[#A8B9AE]">
            Export your entire library of songs, structured sections, setlists, and custom labels into a portable <code className="font-mono text-[#146C43] dark:text-[#6FCF97]">worshipflow-library</code> JSON package.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportBackup}
              isLoading={isExporting}
            >
              <Download className="w-4 h-4" />
              <span>Export WorshipFlow Library</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isImporting}
            >
              <Upload className="w-4 h-4" />
              <span>Restore Library JSON</span>
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
