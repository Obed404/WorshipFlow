import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Eye, AlertCircle } from 'lucide-react';
import { getSongById, createSong, updateSong } from '../api/songs.api.js';
import { getLabels } from '../../labels/api/labels.api.js';
import { ChordSheet } from '../components/ChordSheet.js';
import { ChordToolbar } from '../components/ChordToolbar.js';
import { insertChordAtCursor } from '../../../lib/chords/index.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';

const songFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  artist: z.string().max(255, 'Artist must be 255 characters or less').optional().or(z.literal('')),
  songKey: z.string().max(10, 'Song key must be 10 characters or less').optional().or(z.literal('')),
  capo: z.coerce.number().int().min(0, 'Capo cannot be negative').max(12, 'Capo max is 12').default(0),
  tempo: z.coerce
    .number()
    .int()
    .min(20, 'Tempo min 20')
    .max(300, 'Tempo max 300')
    .nullable()
    .optional()
    .or(z.literal(NaN).transform(() => null)),
  content: z.string().min(1, 'Lyrics and chords content is required'),
  notes: z.string().optional().or(z.literal('')),
  labelIds: z.array(z.number()).default([]),
});

type SongFormValues = z.infer<typeof songFormSchema>;

export const SongFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const songId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [serverError, setServerError] = useState<string | null>(null);
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load existing song if in edit mode
  const { data: existingSong, isLoading: isLoadingSong } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => getSongById(songId),
    enabled: isEditMode && songId > 0,
  });

  // Load available labels
  const { data: availableLabels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => getLabels(),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      title: '',
      artist: '',
      songKey: '',
      capo: 0,
      tempo: null,
      content: '',
      notes: '',
      labelIds: [],
    },
  });

  // Populate form with existing song data
  useEffect(() => {
    if (existingSong) {
      reset({
        title: existingSong.title,
        artist: existingSong.artist || '',
        songKey: existingSong.songKey || '',
        capo: existingSong.capo,
        tempo: existingSong.tempo,
        content: existingSong.content,
        notes: existingSong.notes || '',
        labelIds: existingSong.labels ? existingSong.labels.map((l) => l.id) : [],
      });
    }
  }, [existingSong, reset]);

  // Watch content and key for live preview
  const liveContent = watch('content');
  const liveSongKey = watch('songKey');

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: SongFormValues) =>
      createSong({
        ...data,
        artist: data.artist || null,
        songKey: data.songKey || null,
        notes: data.notes || null,
      }),
    onSuccess: (newSong) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      navigate(`/songs/${newSong.id}`);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to create song');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: SongFormValues) =>
      updateSong(songId, {
        ...data,
        artist: data.artist || null,
        songKey: data.songKey || null,
        notes: data.notes || null,
      }),
    onSuccess: (updatedSong) => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['song', songId] });
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      navigate(`/songs/${updatedSong.id}`);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to update song');
    },
  });

  const onSubmit = (values: SongFormValues) => {
    setServerError(null);
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isSaving = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const handleInsertChord = (chord: string) => {
    const textarea = textareaRef.current;
    const currentText = liveContent || '';
    const start = textarea ? textarea.selectionStart : currentText.length;
    const end = textarea ? textarea.selectionEnd : currentText.length;

    // Save previous state to undo stack
    setUndoHistory((prev) => [...prev, currentText].slice(-20));

    const { newText, newCursor } = insertChordAtCursor(currentText, start, end, chord);
    reset({ ...watch(), content: newText });

    // Restore focus and cursor position after React update
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previous = undoHistory[undoHistory.length - 1];
      setUndoHistory((prev) => prev.slice(0, -1));
      reset({ ...watch(), content: previous });
    }
  };

  const { ref: contentFormRef, ...contentRegisterRest } = register('content');

  if (isEditMode && isLoadingSong) {
    return (
      <div className="w-full max-w-full py-12 text-center text-[#647067] dark:text-[#A8B9AE] animate-pulse">
        Loading song details...
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to={isEditMode ? `/songs/${songId}` : '/songs'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel
        </Link>
        <h1 className="text-xl font-bold text-[#1C2924] dark:text-[#F0F5F0]">
          {isEditMode ? 'Edit Song' : 'Create New Song'}
        </h1>
        <div />
      </div>

      {serverError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-sm text-[#D92D20] dark:text-[#F87171]">
          <AlertCircle className="w-5 h-5 text-[#D92D20] shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-full space-y-6">
        {/* Core Metadata Card */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0] border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            Song Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Song Title *"
              placeholder="e.g. Amazing Grace"
              error={errors.title?.message}
              {...register('title')}
            />

            <Input
              label="Artist / Author"
              placeholder="e.g. John Newton"
              error={errors.artist?.message}
              {...register('artist')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Original Key"
              placeholder="e.g. G, C, Am"
              error={errors.songKey?.message}
              {...register('songKey')}
            />

            <Input
              label="Capo"
              type="number"
              min="0"
              max="12"
              placeholder="0"
              error={errors.capo?.message}
              {...register('capo')}
            />

            <Input
              label="Tempo (BPM)"
              type="number"
              min="20"
              max="300"
              placeholder="120"
              error={errors.tempo?.message}
              {...register('tempo')}
            />
          </div>

          {/* Labels Selection */}
          {availableLabels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-2">
                Associate Labels
              </label>
              <Controller
                name="labelIds"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap items-center gap-2">
                    {availableLabels.map((lbl) => {
                      const isChecked = field.value?.includes(lbl.id);
                      return (
                        <button
                          key={lbl.id}
                          type="button"
                          onClick={() => {
                            const current = field.value || [];
                            if (isChecked) {
                              field.onChange(current.filter((id) => id !== lbl.id));
                            } else {
                              field.onChange([...current, lbl.id]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            isChecked
                              ? 'bg-[#E8F1E9] dark:bg-[#24372C] border-[#198754] dark:border-[#6FCF97] text-[#146C43] dark:text-[#6FCF97] shadow-2xs'
                              : 'bg-white dark:bg-[#17251E] border-[#E4E9E3] dark:border-[#2A4033] text-[#647067] dark:text-[#A8B9AE] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C]'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isChecked ? 'bg-[#198754] dark:bg-[#6FCF97]' : 'bg-[#E4E9E3] dark:bg-[#2A4033]'
                            }`}
                          />
                          {lbl.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-1">
              Performance / Arrangement Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Fingerpicking pattern: P-I-M-A. Strum softly on verse 2."
              className="w-full rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] px-3 py-2 text-sm bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97] resize-y"
              {...register('notes')}
            />
          </div>
        </div>

        {/* Lyrics & Chords Editor with Live Preview */}
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E9E3] dark:border-[#2A4033] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#1C2924] dark:text-[#F0F5F0]">
                Lyrics &amp; Chord Notation *
              </h2>
              <p className="text-xs text-[#647067] dark:text-[#A8B9AE] mt-0.5">
                Place chords inside square brackets directly before the lyric syllable, e.g.{' '}
                <code className="text-[#146C43] dark:text-[#6FCF97] font-mono font-bold bg-[#E8F1E9] dark:bg-[#24372C] px-1 py-0.5 rounded">
                  [C]Amazing [G]grace
                </code>
              </p>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex sm:hidden border border-[#E4E9E3] dark:border-[#2A4033] rounded-lg p-0.5 bg-[#E8F1E9] dark:bg-[#24372C]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-white dark:bg-[#17251E] shadow-2xs text-[#1C2924] dark:text-[#F0F5F0]'
                    : 'text-[#647067] dark:text-[#A8B9AE]'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-[#17251E] shadow-2xs text-[#1C2924] dark:text-[#F0F5F0]'
                    : 'text-[#647067] dark:text-[#A8B9AE]'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
            {/* Input Editor */}
            <div className={`space-y-3 ${activeTab === 'preview' ? 'hidden sm:block' : 'block'}`}>
              <ChordToolbar
                onInsertChord={handleInsertChord}
                onUndoLastChord={handleUndo}
                canUndo={undoHistory.length > 0}
                songKey={liveSongKey}
                onSelectKey={(k) => setValue('songKey', k, { shouldValidate: true })}
              />
              <textarea
                ref={(e) => {
                  contentFormRef(e);
                  textareaRef.current = e;
                }}
                {...contentRegisterRest}
                rows={16}
                placeholder={`[Verse 1]\n[C]Amazing [G]grace, how [Am]sweet the [F]sound\n[C]That saved a [G]wretch like [C]me\n\n[Chorus]\n[F]I once was [C]lost, but [G]now am [Am]found`}
                className={`w-full rounded-xl border px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97] resize-y bg-[#FAFAF6] dark:bg-[#101A16] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] ${
                  errors.content
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-[#E4E9E3] dark:border-[#2A4033]'
                }`}
              />
              {errors.content && (
                <p className="mt-1 text-xs text-[#D92D20] dark:text-[#F87171]">{errors.content.message}</p>
              )}
            </div>

            {/* Live Chord Sheet Preview */}
            <div
              className={`border border-[#E4E9E3] dark:border-[#2A4033] rounded-xl p-4 bg-[#FAFAF6] dark:bg-[#101A16] min-h-[350px] ${
                activeTab === 'edit' ? 'hidden sm:block' : 'block'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[#647067] dark:text-[#A8B9AE] mb-3 pb-2 border-b border-[#E4E9E3] dark:border-[#2A4033]">
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </div>
              <ChordSheet
                content={liveContent || ''}
                originalKey={liveSongKey || null}
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to={isEditMode ? `/songs/${songId}` : '/songs'}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            <Save className="w-4 h-4" />
            {isEditMode ? 'Update Song' : 'Create Song'}
          </Button>
        </div>
      </form>
    </div>
  );
};
