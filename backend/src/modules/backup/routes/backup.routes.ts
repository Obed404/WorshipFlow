import { Router, Request, Response, NextFunction } from 'express';
import { songRepository } from '../../songs/repository/song.repository.js';
import { labelRepository } from '../../labels/repository/label.repository.js';
import { setlistRepository } from '../../setlists/repository/setlist.repository.js';
import { parseRawToStructuredSections, structuredSectionsToRaw } from '../../songs/utils/song_converter.js';
import { createSuccessResponse } from '../../common/types/api.types.js';
import { AppError } from '../../common/utils/app_error.js';

const router = Router();

// Export full WorshipFlow library backup
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const songs = await songRepository.findAll({
      page: 1,
      limit: 5000,
      sort: 'title',
      order: 'ASC',
      labelIds: [],
    });
    const labels = await labelRepository.findAll({ limit: 1000 });
    const setlistSummaries = await setlistRepository.findAll();
    const setlists = await Promise.all(
      setlistSummaries.map(async (s) => {
        const full = await setlistRepository.findById(s.id);
        return full || s;
      })
    );

    const backupData = {
      format: 'worshipflow-library',
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        songs: songs.length,
        labels: labels.length,
        setlists: setlists.length,
      },
      labels,
      songs: songs.map((s) => ({
        ...s,
        sections: s.sections || parseRawToStructuredSections(s.content),
      })),
      setlists,
    };

    if (req.query.download === 'true') {
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="worshipflow-library-${timestamp}.json"`);
      res.setHeader('Content-Type', 'application/json');
    }

    res.json(createSuccessResponse(backupData, 'WorshipFlow library exported successfully'));
  } catch (error) {
    next(error);
  }
});

// Import / restore backup JSON
router.post('/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.songs)) {
      throw AppError.badRequest('Invalid backup format: "songs" array is required');
    }

    if (payload.songs.length > 5000) {
      throw AppError.badRequest('Restore payload exceeds maximum limit of 5,000 songs');
    }
    if (payload.labels && Array.isArray(payload.labels) && payload.labels.length > 1000) {
      throw AppError.badRequest('Restore payload exceeds maximum limit of 1,000 labels');
    }
    if (payload.setlists && Array.isArray(payload.setlists) && payload.setlists.length > 500) {
      throw AppError.badRequest('Restore payload exceeds maximum limit of 500 setlists');
    }

    const { songs = [], labels = [], setlists = [] } = payload;
    let importedLabels = 0;
    let importedSongs = 0;
    let importedSetlists = 0;

    // 1. Restore labels first
    const labelIdMap = new Map<number, number>(); // oldId -> newId

    for (const lbl of labels) {
      if (!lbl || !lbl.name) continue;
      const existing = await labelRepository.findByName(lbl.name);
      if (existing) {
        if (lbl.id) labelIdMap.set(lbl.id, existing.id);
      } else {
        try {
          const created = await labelRepository.create({
            name: lbl.name,
            color: lbl.color || '#198754',
            instrument: lbl.instrument || null,
          });
          if (lbl.id) labelIdMap.set(lbl.id, created.id);
          importedLabels++;
        } catch {
          const fallback = await labelRepository.findByName(lbl.name);
          if (fallback && lbl.id) labelIdMap.set(lbl.id, fallback.id);
        }
      }
    }

    // 2. Restore songs
    const songIdMap = new Map<number, number>(); // oldSongId -> newSongId

    for (const song of songs) {
      if (!song || typeof song !== 'object') continue;
      let content = song.content || '';
      if (!content && Array.isArray(song.sections)) {
        content = structuredSectionsToRaw(song.sections);
      }
      if (!song.title || !content) continue;

      // Map label IDs to existing/new IDs
      const mappedLabelIds: number[] = [];
      if (Array.isArray(song.labels)) {
        for (const l of song.labels) {
          if (!l) continue;
          const mappedId = typeof l === 'object' && l.id ? labelIdMap.get(l.id) : null;
          if (mappedId && !mappedLabelIds.includes(mappedId)) {
            mappedLabelIds.push(mappedId);
          } else {
            const name = typeof l === 'string' ? l : l.name;
            if (name) {
              const existing = await labelRepository.findByName(name);
              if (existing && !mappedLabelIds.includes(existing.id)) {
                mappedLabelIds.push(existing.id);
              }
            }
          }
        }
      }
      if (Array.isArray(song.labelIds)) {
        for (const oldId of song.labelIds) {
          const mappedId = labelIdMap.get(oldId) ?? oldId;
          if (mappedId && !mappedLabelIds.includes(mappedId)) {
            mappedLabelIds.push(mappedId);
          }
        }
      }

      // Check if existing song with same title
      const existing = await songRepository.findByTitle(song.title);
      let targetSongId: number;

      if (existing) {
        const updated = await songRepository.update(existing.id, {
          title: song.title,
          artist: song.artist ?? null,
          songKey: song.songKey ?? null,
          capo: song.capo ?? 0,
          tempo: song.tempo ?? null,
          difficulty: song.difficulty ?? existing.difficulty,
          content,
          notes: song.notes ?? null,
          labelIds: mappedLabelIds.length > 0 ? mappedLabelIds : undefined,
        });
        targetSongId = updated.id;
      } else {
        const created = await songRepository.create({
          title: song.title,
          artist: song.artist ?? null,
          songKey: song.songKey ?? null,
          capo: song.capo ?? 0,
          tempo: song.tempo ?? null,
          difficulty: song.difficulty ?? 'BEGINNER',
          content,
          notes: song.notes ?? null,
          labelIds: mappedLabelIds,
        });
        targetSongId = created.id;
        importedSongs++;
      }

      if (song.id) {
        songIdMap.set(song.id, targetSongId);
      }
    }

    // 3. Restore setlists if present
    for (const st of setlists) {
      if (!st || !st.name) continue;
      try {
        let targetSetlist: any;
        const existing = await setlistRepository.findByName(st.name);
        if (existing) {
          targetSetlist = existing;
          if (st.description && st.description !== existing.description) {
            await setlistRepository.update(existing.id, { description: st.description });
          }
        } else {
          targetSetlist = await setlistRepository.create({
            name: st.name,
            description: st.description || null,
          });
          importedSetlists++;
        }

        // Restore setlist songs if present
        if (Array.isArray(st.songs)) {
          // Sort songs by position to ensure sequential insertion
          const sortedSongs = [...st.songs].sort((a, b) => {
            const posA = typeof a?.position === 'number' ? a.position : 0;
            const posB = typeof b?.position === 'number' ? b.position : 0;
            return posA - posB;
          });

          for (let pos = 0; pos < sortedSongs.length; pos++) {
            const setlistSong = sortedSongs[pos];
            if (!setlistSong) continue;

            const rawSongId = setlistSong.songId ?? setlistSong.song?.id ?? setlistSong.id;
            if (!rawSongId) continue;

            const newSongId = songIdMap.get(rawSongId) ?? rawSongId;

            // Verify the song actually exists in the library
            const songExists = await songRepository.findById(newSongId);
            if (!songExists) continue;

            const itemPosition = typeof setlistSong.position === 'number' ? setlistSong.position : pos;
            const transposeOffset = typeof setlistSong.transposeOffset === 'number' ? setlistSong.transposeOffset : 0;

            try {
              await setlistRepository.addSong(targetSetlist.id, newSongId, transposeOffset, itemPosition);
            } catch (err) {
              console.error(`Error adding song #${newSongId} to setlist #${targetSetlist.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`Error restoring setlist '${st?.name}':`, err);
      }
    }

    res.json(
      createSuccessResponse(
        { importedSongs, importedLabels, importedSetlists },
        `Successfully restored WorshipFlow library: ${importedSongs} new songs, ${importedLabels} new labels, ${importedSetlists} setlists.`
      )
    );
  } catch (error) {
    next(error);
  }
});

export default router;
