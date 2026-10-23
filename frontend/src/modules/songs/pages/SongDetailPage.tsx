import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Printer,
  Music,
  Hash,
  Gauge,
  Calendar,
  AlertCircle,
  Play,
  FileDown,
  Camera,
  Star,
  Download,
} from 'lucide-react';
import { getSongById, deleteSong, exportSongJson } from '../api/songs.api.js';
import { TransposeBar } from '../components/TransposeBar.js';
import { ChordSheet } from '../components/ChordSheet.js';
import { PerformanceModeModal } from '../components/PerformanceModeModal.js';
import { Button } from '../../../components/ui/Button.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { useFavorites, useRecentlyViewed } from '../../../lib/hooks/useFavorites.js';
import { useSongViewSettings } from '../../../lib/hooks/useSongViewSettings.js';
import { exportSongAsPdf, exportSongAsPng } from '../../../lib/export/exportSong.js';
import { transposeChord } from '../../../lib/chords/index.js';
import { cn } from '../../../lib/utils.js';

export const SongDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [transposeOffset, setTransposeOffset] = useState<number>(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportContainerRef = useRef<HTMLDivElement>(null);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { trackViewed } = useRecentlyViewed();
  const {
    fontSize,
    preferredColumns,
    activeColumns,
    isFallbackActive,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    setPreferredColumns,
  } = useSongViewSettings();

  const songId = parseInt(id || '0', 10);

  const {
    data: song,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => getSongById(songId),
    enabled: songId > 0,
  });

  // Track recently viewed
  useEffect(() => {
    if (songId > 0) {
      trackViewed(songId);
    }
  }, [songId, trackViewed]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteSong(songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      navigate('/songs');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!song || !exportContainerRef.current) return;
    try {
      setIsExportingPdf(true);
      setExportError(null);
      const currentDisplayedKey = song.songKey ? transposeChord(song.songKey, transposeOffset) : null;
      await exportSongAsPdf({
        element: exportContainerRef.current,
        title: song.title,
        artist: song.artist,
        currentKey: currentDisplayedKey,
      });
    } catch (err: any) {
      console.error('PDF export error:', err);
      setExportError(err.message || 'Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportPng = async () => {
    if (!song || !exportContainerRef.current) return;
    try {
      setIsExportingPng(true);
      setExportError(null);
      const currentDisplayedKey = song.songKey ? transposeChord(song.songKey, transposeOffset) : null;
      await exportSongAsPng({
        element: exportContainerRef.current,
        title: song.title,
        artist: song.artist,
        currentKey: currentDisplayedKey,
      });
    } catch (err: any) {
      console.error('PNG snapshot error:', err);
      setExportError(err.message || 'Failed to save PNG snapshot');
    } finally {
      setIsExportingPng(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full space-y-6 animate-pulse">
        <div className="h-8 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-1/3" />
        <div className="h-4 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-1/4" />
        <div className="h-24 bg-[#E8F1E9] dark:bg-[#24372C] rounded-xl" />
        <div className="h-96 bg-[#E8F1E9] dark:bg-[#24372C] rounded-xl" />
      </div>
    );
  }

  if (isError || !song) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12 bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-8 shadow-xs">
        <AlertCircle className="w-10 h-10 text-[#D92D20] mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-[#1C2924] dark:text-[#F0F5F0] mb-2">Song Not Found</h2>
        <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mb-6">
          {error instanceof Error
            ? error.message
            : "The song you're looking for does not exist or has been removed."}
        </p>
        <Link to="/songs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Songs
          </Button>
        </Link>
      </div>
    );
  }

  const currentDisplayedKey = song.songKey ? transposeChord(song.songKey, transposeOffset) : null;
  const favorited = isFavorite(song.id);

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Top action bar - Hidden during print */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/songs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Performance Mode Trigger */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsPerformanceOpen(true)}
            className="shadow-xs"
            title="Open distraction-free live performance mode"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Perform</span>
          </Button>

          {/* Favorite Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleFavorite(song.id)}
            title={favorited ? 'Remove from favorites' : 'Add to favorites'}
            className={cn(favorited && 'text-[#198754] border-[#198754]/40 bg-[#E8F1E9] dark:bg-[#24372C] dark:text-[#6FCF97] dark:border-[#6FCF97]/40')}
          >
            <Star className={cn('w-4 h-4', favorited ? 'fill-[#198754] text-[#198754] dark:fill-[#6FCF97] dark:text-[#6FCF97]' : 'text-[#647067] dark:text-[#A8B9AE]')} />
          </Button>

          {/* Download PDF */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            isLoading={isExportingPdf}
            title="Download formatted A4 PDF"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>

          {/* Save PNG Snapshot */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPng}
            isLoading={isExportingPng}
            title="Save PNG image snapshot of chord sheet"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">PNG</span>
          </Button>

          {/* Export JSON */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportSongJson(song.id, song.title)}
            title="Export WorshipFlow JSON document (.worshipflow)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">JSON</span>
          </Button>

          {/* Print */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="Print song sheet"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          {/* Edit */}
          <Link to={`/songs/${song.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </Link>

          {/* Delete */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-[#D92D20] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {exportError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-[#D92D20] dark:text-[#F87171] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Printable / Snapshot Capture Container */}
      <div ref={exportContainerRef} className="w-full max-w-full space-y-6">
        {/* Song Header Card */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs print:border-none print:shadow-none print:p-0">
          <div className="border-b border-[#E4E9E3] dark:border-[#2A4033] pb-4">
            <h1 className="text-3xl font-extrabold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight print:text-2xl">
              {song.title}
            </h1>
            <p className="text-base text-[#647067] dark:text-[#A8B9AE] font-medium mt-1">
              {song.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-4 pt-4 text-xs font-mono text-[#647067] dark:text-[#A8B9AE]">
            {currentDisplayedKey && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E8F1E9] dark:bg-[#24372C] border border-[#E4E9E3] dark:border-[#2A4033] rounded-md">
                <Music className="w-3.5 h-3.5 text-[#198754] dark:text-[#6FCF97]" />
                <span>
                  Key: <strong className="text-[#1C2924] dark:text-[#F0F5F0]">{currentDisplayedKey}</strong>
                  {transposeOffset !== 0 && song.songKey && (
                    <span className="text-[10px] ml-1 opacity-75">(orig: {song.songKey})</span>
                  )}
                </span>
              </div>
            )}
            {song.capo > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E8F1E9] dark:bg-[#24372C] border border-[#E4E9E3] dark:border-[#2A4033] rounded-md">
                <Hash className="w-3.5 h-3.5 text-[#198754] dark:text-[#6FCF97]" />
                <span>Capo: <strong className="text-[#1C2924] dark:text-[#F0F5F0]">{song.capo}</strong></span>
              </div>
            )}
            {song.tempo && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E8F1E9] dark:bg-[#24372C] border border-[#E4E9E3] dark:border-[#2A4033] rounded-md">
                <Gauge className="w-3.5 h-3.5 text-[#198754] dark:text-[#6FCF97]" />
                <span>Tempo: <strong className="text-[#1C2924] dark:text-[#F0F5F0]">{song.tempo} BPM</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[#647067] dark:text-[#A8B9AE] font-sans ml-auto print:hidden">
              <Calendar className="w-3.5 h-3.5" />
              <span>Updated: {new Date(song.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Labels */}
          {song.labels && song.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-4 mt-4 border-t border-[#E4E9E3] dark:border-[#2A4033] print:hidden">
              {song.labels.map((label) => (
                <Badge key={label.id} color={label.color}>
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Notes (if any) */}
          {song.notes && (
            <div className="mt-4 p-3.5 bg-[#E8F1E9]/70 dark:bg-[#24372C]/40 border border-[#E4E9E3] dark:border-[#2A4033] rounded-xl text-xs text-[#1C2924] dark:text-[#F0F5F0] font-sans leading-relaxed">
              <strong className="font-semibold block mb-0.5 text-[#146C43] dark:text-[#6FCF97]">Notes:</strong>
              {song.notes}
            </div>
          )}
        </div>

        {/* Sticky Transpose & Reading Control Bar */}
        <TransposeBar
          originalKey={song.songKey}
          offset={transposeOffset}
          onChangeOffset={(newOffset) => setTransposeOffset(newOffset)}
          onReset={() => setTransposeOffset(0)}
          fontSize={fontSize}
          onIncreaseFontSize={increaseFontSize}
          onDecreaseFontSize={decreaseFontSize}
          onResetFontSize={resetFontSize}
          columns={activeColumns}
          preferredColumns={preferredColumns}
          onChangeColumns={setPreferredColumns}
          isFallbackActive={isFallbackActive}
          className="w-full"
        />

        {/* Chord Sheet Viewer */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-5 sm:p-6 md:p-8 shadow-xs print:shadow-none print:border-none print:p-0 min-h-[300px]">
          <ChordSheet
            content={song.content}
            transposeOffset={transposeOffset}
            originalKey={song.songKey}
            fontSize={fontSize}
            columns={activeColumns}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Song"
        description="Are you sure you want to delete this song? This action cannot be undone."
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete Song
          </Button>
        </div>
      </Modal>

      {/* Live Performance Mode Modal */}
      {song && (
        <PerformanceModeModal
          song={song}
          initialOffset={transposeOffset}
          isOpen={isPerformanceOpen}
          onClose={() => setIsPerformanceOpen(false)}
          onTransposeChange={setTransposeOffset}
        />
      )}
    </div>
  );
};
