import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Tags, AlertCircle, Music } from 'lucide-react';
import { getLabels, createLabel, updateLabel, deleteLabel } from '../api/labels.api.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Modal } from '../../../components/ui/Modal.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';
import { INSTRUMENT_LABELS } from '../../../lib/utils.js';
import type { LabelWithCount } from '../types/label.types.js';

const COLOR_PRESETS = [
  { name: 'Forest Green', hex: '#198754', bgClass: 'bg-[#198754]' },
  { name: 'Blue', hex: '#3b82f6', bgClass: 'bg-blue-500' },
  { name: 'Red', hex: '#ef4444', bgClass: 'bg-red-500' },
  { name: 'Emerald', hex: '#10b981', bgClass: 'bg-emerald-500' },
  { name: 'Amber', hex: '#f59e0b', bgClass: 'bg-amber-500' },
  { name: 'Purple', hex: '#8b5cf6', bgClass: 'bg-purple-500' },
  { name: 'Indigo', hex: '#6366f1', bgClass: 'bg-indigo-500' },
  { name: 'Rose', hex: '#e11d48', bgClass: 'bg-rose-500' },
  { name: 'Cyan', hex: '#06b6d4', bgClass: 'bg-cyan-500' },
];

const labelFormSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(100, 'Max 100 characters'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').default('#198754'),
  instrument: z.enum(['GUITAR', 'PIANO', 'UKULELE', 'BASS', 'MANDOLIN', 'OTHER']).nullable().optional(),
});

type LabelFormValues = z.infer<typeof labelFormSchema>;

export const LabelsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelWithCount | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<LabelWithCount | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    data: labels = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['labels'],
    queryFn: () => getLabels(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LabelFormValues>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: {
      name: '',
      color: '#198754',
      instrument: null,
    },
  });

  const selectedColor = watch('color');

  const openCreateModal = () => {
    setEditingLabel(null);
    setServerError(null);
    reset({ name: '', color: '#198754', instrument: null });
    setIsModalOpen(true);
  };

  const openEditModal = (label: LabelWithCount) => {
    setEditingLabel(label);
    setServerError(null);
    reset({ name: label.name, color: label.color, instrument: label.instrument });
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: LabelFormValues) =>
      createLabel({ name: data.name, color: data.color, instrument: data.instrument || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to create label');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: LabelFormValues) =>
      updateLabel(editingLabel!.id, {
        name: data.name,
        color: data.color,
        instrument: data.instrument || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to update label');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setDeletingLabel(null);
    },
  });

  const onSubmit = (values: LabelFormValues) => {
    setServerError(null);
    if (editingLabel) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight">
            Song Labels
          </h1>
          <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mt-1">
            Organize and classify songs with custom color-coded labels and instruments.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Create Label
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] divide-y divide-[#E4E9E3] dark:divide-[#2A4033] shadow-xs animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="h-5 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-1/4" />
              <div className="h-5 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#D92D20] mx-auto" />
          <h3 className="text-base font-semibold text-[#D92D20] dark:text-[#F87171]">Failed to load labels</h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof Error ? error.message : 'Please check your connection.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && labels.length === 0 && (
        <EmptyState
          icon={<Tags className="w-8 h-8" />}
          title="No labels found"
          description="Create labels to categorize songs by mood, instrument, genre, or key."
          action={
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              Add First Label
            </Button>
          }
        />
      )}

      {/* Labels List */}
      {!isLoading && !isError && labels.length > 0 && (
        <div className="w-full bg-white dark:bg-[#17251E] rounded-2xl border border-[#E4E9E3] dark:border-[#2A4033] shadow-xs overflow-hidden divide-y divide-[#E4E9E3] dark:divide-[#2A4033]">
          {labels.map((label) => (
            <div
              key={label.id}
              className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#E8F1E9]/50 dark:hover:bg-[#24372C]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge color={label.color} className="text-sm px-3 py-1 font-semibold">
                  {label.name}
                </Badge>
                {label.instrument && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#647067] dark:text-[#A8B9AE] bg-[#E8F1E9] dark:bg-[#24372C] px-2 py-0.5 rounded">
                    <Music className="w-3 h-3 text-[#198754] dark:text-[#6FCF97]" />
                    {INSTRUMENT_LABELS[label.instrument] || label.instrument}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-[#647067] dark:text-[#A8B9AE] font-medium">
                  {label.songCount} {label.songCount === 1 ? 'song' : 'songs'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(label)}
                    className="p-2 text-[#647067] dark:text-[#A8B9AE] hover:text-[#1C2924] dark:hover:text-[#F0F5F0] hover:bg-[#E8F1E9] dark:hover:bg-[#24372C] rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Edit label"
                    aria-label={`Edit ${label.name} label`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingLabel(label)}
                    className="p-2 text-[#647067] dark:text-[#A8B9AE] hover:text-[#D92D20] dark:hover:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Delete label"
                    aria-label={`Delete ${label.name} label`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLabel ? 'Edit Label' : 'Create Label'}
        description="Configure the label name, color theme, and optional instrument association."
      >
        {serverError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-[#D92D20] dark:text-[#F87171] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Label Name *"
            placeholder="e.g. Worship, Rock, Ukulele"
            error={errors.name?.message}
            {...register('name')}
          />

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-2">
              Color Theme
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setValue('color', preset.hex)}
                  className={`w-7 h-7 rounded-full transition-transform ${preset.bgClass} ${
                    selectedColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'ring-2 ring-offset-2 ring-[#198754] dark:ring-offset-[#17251E] scale-110'
                      : 'hover:scale-105'
                  }`}
                  title={preset.name}
                />
              ))}
            </div>
            <Input
              placeholder="#198754"
              error={errors.color?.message}
              {...register('color')}
            />
          </div>

          {/* Instrument Association */}
          <div>
            <label className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-1">
              Instrument Association (Optional)
            </label>
            <select
              className="w-full rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] px-3 py-2 text-sm bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97]"
              {...register('instrument')}
            >
              <option value="">None (Generic / Any)</option>
              <option value="GUITAR">Guitar</option>
              <option value="PIANO">Piano</option>
              <option value="UKULELE">Ukulele</option>
              <option value="BASS">Bass</option>
              <option value="MANDOLIN">Mandolin</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E4E9E3] dark:border-[#2A4033]">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingLabel ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingLabel)}
        onClose={() => setDeletingLabel(null)}
        title="Delete Label"
        description={`Are you sure you want to delete the "${deletingLabel?.name}" label?`}
      >
        {deletingLabel && deletingLabel.songCount > 0 && (
          <div className="p-3 bg-[#E8F1E9] dark:bg-[#24372C] border border-[#198754]/30 dark:border-[#6FCF97]/30 rounded-lg text-xs text-[#146C43] dark:text-[#F0F5F0] mb-4">
            Warning: This label is currently associated with{' '}
            <strong>{deletingLabel.songCount}</strong> song(s). Deleting it will remove the label
            association from those songs, but the songs themselves will not be deleted.
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => setDeletingLabel(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deletingLabel && deleteMutation.mutate(deletingLabel.id)}
          >
            Delete Label
          </Button>
        </div>
      </Modal>
    </div>
  );
};
