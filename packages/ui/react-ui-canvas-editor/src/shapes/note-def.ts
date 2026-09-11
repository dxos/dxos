//
// Copyright 2024 DXOS.org
//

import { type MakeOptional } from '@dxos/util';

import { type ShapeDef } from '../components/index.ts';
import { type NoteShape } from '../types/index.ts';
import { NoteComponent } from './Note.tsx';

// Kept out of `Note.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the factory and shape def exported beside one force a full page reload on every edit.

export type CreateNoteProps = Omit<MakeOptional<NoteShape, 'size'>, 'type'>;

export const createNote = ({ id, ...rest }: CreateNoteProps): NoteShape => ({
  id,
  type: 'note',
  size: { width: 256, height: 128 },
  ...rest,
});

export const noteShape: ShapeDef<NoteShape> = {
  type: 'note',
  name: 'Note',
  icon: 'ph--note--regular',
  component: NoteComponent,
  createShape: ({ id, center }) => createNote({ id, center }),
  resizable: true,
};
