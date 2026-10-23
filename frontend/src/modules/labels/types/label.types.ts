export type Instrument = 'GUITAR' | 'PIANO' | 'UKULELE' | 'BASS' | 'MANDOLIN' | 'OTHER';

export interface Label {
  id: number;
  name: string;
  color: string;
  instrument: Instrument | null;
  createdAt: string;
}

export interface LabelWithCount extends Label {
  songCount: number;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
  instrument?: Instrument | null;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
  instrument?: Instrument | null;
}

export interface LabelQueryParams {
  search?: string;
  instrument?: Instrument;
  sort?: 'name' | 'created_at' | 'song_count';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}
