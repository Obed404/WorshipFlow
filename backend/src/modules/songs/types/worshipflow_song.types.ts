export interface WorshipFlowChord {
  name: string;
  position: number; // 0-based character index within the lyric line
}

export interface WorshipFlowLine {
  id: string;
  lyrics: string;
  chords: WorshipFlowChord[];
}

export type SectionType =
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'intro'
  | 'outro'
  | 'pre-chorus'
  | 'hook'
  | 'interlude'
  | 'instrumental'
  | 'tag'
  | 'ending'
  | 'solo'
  | 'other';

export interface WorshipFlowSection {
  id: string;
  type: SectionType;
  label: string; // e.g. "Verse 1", "Chorus", "Bridge"
  lines: WorshipFlowLine[];
}

export interface WorshipFlowSongMetadata {
  id?: number | string;
  title: string;
  artist?: string | null;
  songKey?: string | null;
  capo?: number;
  tempo?: number | null;
  timeSignature?: string | null;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  notes?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorshipFlowSongDocument {
  format: 'worshipflow-song';
  version: 1;
  song: WorshipFlowSongMetadata & {
    sections: WorshipFlowSection[];
  };
}

export interface WorshipFlowLibraryPackage {
  format: 'worshipflow-library';
  version: 1;
  exportedAt: string;
  counts: {
    songs: number;
    labels: number;
    setlists: number;
  };
  labels: any[];
  songs: (WorshipFlowSongMetadata & {
    content: string;
    sections?: WorshipFlowSection[];
  })[];
  setlists: any[];
}
