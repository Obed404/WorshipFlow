import React from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '../types/song.types.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Music, Hash, Gauge, Star } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export interface SongCardProps {
  song: Song;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isFavorite = false,
  onToggleFavorite,
}) => {
  return (
    <Link
      to={`/songs/${song.id}`}
      className="group block bg-white dark:bg-[#17251E] rounded-xl border border-[#E4E9E3] dark:border-[#2A4033] p-5 shadow-xs hover:shadow-md hover:border-[#198754] dark:hover:border-[#6FCF97] transition-all relative"
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          {/* Header with Title and Favorite Star */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="font-semibold text-[#1C2924] dark:text-[#F0F5F0] group-hover:text-[#198754] dark:group-hover:text-[#6FCF97] transition-colors line-clamp-1 text-base pr-7">
              {song.title}
            </h3>

            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(song.id);
                }}
                className={cn(
                  'absolute top-4 right-4 p-1.5 rounded-lg transition-colors',
                  isFavorite
                    ? 'text-[#198754] dark:text-[#6FCF97]'
                    : 'text-[#647067]/40 dark:text-[#A8B9AE]/40 hover:text-[#198754] dark:hover:text-[#6FCF97]'
                )}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star
                  className={cn(
                    'w-4 h-4 transition-transform active:scale-125',
                    isFavorite
                      ? 'fill-[#198754] text-[#198754] dark:fill-[#6FCF97] dark:text-[#6FCF97]'
                      : 'hover:fill-[#198754]/20'
                  )}
                />
              </button>
            )}
          </div>

          {/* Artist */}
          <p className="text-sm text-[#647067] dark:text-[#A8B9AE] mb-3.5 line-clamp-1">
            {song.artist || 'Unknown Artist'}
          </p>

          {/* Metadata badges (Key, Capo, Tempo) */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-[#647067] dark:text-[#A8B9AE] font-mono">
            {song.songKey && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F1E9] dark:bg-[#24372C] rounded-md">
                <Music className="w-3 h-3 text-[#198754] dark:text-[#6FCF97]" />
                Key: {song.songKey}
              </span>
            )}
            {song.capo > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F1E9] dark:bg-[#24372C] rounded-md">
                <Hash className="w-3 h-3 text-[#198754] dark:text-[#6FCF97]" />
                Capo {song.capo}
              </span>
            )}
            {song.tempo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F1E9] dark:bg-[#24372C] rounded-md">
                <Gauge className="w-3 h-3 text-[#198754] dark:text-[#6FCF97]" />
                {song.tempo} BPM
              </span>
            )}
          </div>
        </div>

        {/* Labels at the bottom */}
        {song.labels && song.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#E4E9E3] dark:border-[#2A4033]">
            {song.labels.slice(0, 4).map((label) => (
              <Badge key={label.id} color={label.color}>
                {label.name}
              </Badge>
            ))}
            {song.labels.length > 4 && (
              <span className="text-[10px] text-[#647067] dark:text-[#A8B9AE] font-medium px-1">
                +{song.labels.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};
