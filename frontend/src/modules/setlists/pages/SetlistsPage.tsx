import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ListMusic, Calendar, Trash2, ArrowRight } from 'lucide-react';
import { getSetlists, createSetlist, deleteSetlist, type Setlist } from '../api/setlists.api.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';
import { Modal } from '../../../components/ui/Modal.js';
import { EmptyState } from '../../../components/ui/EmptyState.js';

export const SetlistsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [setName, setSetName] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [deletingSetlist, setDeletingSetlist] = useState<Setlist | null>(null);

  const { data: setlists = [], isLoading } = useQuery({
    queryKey: ['setlists'],
    queryFn: getSetlists,
  });

  const createMutation = useMutation({
    mutationFn: () => createSetlist({ name: setName, description: setDescription || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setIsCreateOpen(false);
      setSetName('');
      setSetDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSetlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setDeletingSetlist(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2924] dark:text-[#F0F5F0] tracking-tight">
            Performance Setlists
          </h1>
          <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mt-1">
            Organize songs into ordered setlists for gigs, practice, and worship services.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Setlist
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#17251E] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] p-5 animate-pulse space-y-3"
            >
              <div className="h-5 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-1/3" />
              <div className="h-4 bg-[#E8F1E9] dark:bg-[#24372C] rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && setlists.length === 0 && (
        <EmptyState
          icon={<ListMusic className="w-8 h-8 text-[#198754] dark:text-[#6FCF97]" />}
          title="No setlists created yet"
          description="Create your first setlist to group songs together for a rehearsal or performance session."
          action={
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Create First Setlist
            </Button>
          }
        />
      )}

      {/* Setlists Grid */}
      {!isLoading && setlists.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {setlists.map((setlist) => (
            <div
              key={setlist.id}
              className="bg-white dark:bg-[#17251E] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] p-5 shadow-xs hover:border-[#198754] dark:hover:border-[#6FCF97] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    to={`/setlists/${setlist.id}`}
                    className="font-bold text-base text-[#1C2924] dark:text-[#F0F5F0] hover:text-[#198754] dark:hover:text-[#6FCF97] transition-colors"
                  >
                    {setlist.name}
                  </Link>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F1E9] dark:bg-[#24372C] text-[#146C43] dark:text-[#6FCF97] border border-[#198754]/30 dark:border-[#6FCF97]/30 shrink-0">
                    {setlist.songCount} {setlist.songCount === 1 ? 'song' : 'songs'}
                  </span>
                </div>

                {setlist.description && (
                  <p className="text-xs text-[#647067] dark:text-[#A8B9AE] mb-4 line-clamp-2">
                    {setlist.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E4E9E3] dark:border-[#2A4033] text-xs">
                <span className="text-[#647067] dark:text-[#A8B9AE] inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(setlist.updatedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingSetlist(setlist)}
                    className="p-1 text-[#647067] dark:text-[#A8B9AE] hover:text-[#D92D20] dark:hover:text-[#F87171] transition-colors"
                    title="Delete setlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    to={`/setlists/${setlist.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#146C43] dark:text-[#6FCF97] hover:underline"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Setlist"
        description="Setlists group songs in a specific performance order."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Setlist Name *"
            placeholder="e.g. Sunday Morning Service, Friday Gig"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-[#1C2924] dark:text-[#F0F5F0] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Set 1: Acoustic opening, upbeat transition on song 3."
              value={setDescription}
              onChange={(e) => setSetDescription(e.target.value)}
              className="w-full rounded-lg border border-[#E4E9E3] dark:border-[#2A4033] px-3 py-2 text-sm bg-white dark:bg-[#17251E] text-[#1C2924] dark:text-[#F0F5F0] placeholder:text-[#647067] dark:placeholder:text-[#A8B9AE] focus:outline-none focus:ring-2 focus:ring-[#198754] dark:focus:ring-[#6FCF97]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#E4E9E3] dark:border-[#2A4033]">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} disabled={!setName.trim()}>
              Create Setlist
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={Boolean(deletingSetlist)}
        onClose={() => setDeletingSetlist(null)}
        title="Delete Setlist"
        description={`Are you sure you want to delete the setlist "${deletingSetlist?.name}"? The songs inside will not be deleted.`}
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={() => setDeletingSetlist(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => deletingSetlist && deleteMutation.mutate(deletingSetlist.id)}
          >
            Delete Setlist
          </Button>
        </div>
      </Modal>
    </div>
  );
};
