//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type MakeOptional } from '@dxos/util';

import { type ShapeComponentProps, type ShapeDef, TextBox } from '../components';
import { type NoteShape } from '../types';

export type CreateNoteProps = Omit<MakeOptional<NoteShape, 'size'>, 'type'>;

export const createNote = ({ id, ...rest }: CreateNoteProps): NoteShape => ({
  id,
  type: 'note',
  size: { width: 256, height: 128 },
  ...rest,
});

export const NoteComponent = ({ shape }: ShapeComponentProps<NoteShape>) => {
  return <TextBox />;
};

export const noteShape: ShapeDef<NoteShape> = {
  type: 'note',
  name: 'Note',
  icon: 'ph--note--regular',
  component: NoteComponent,
  createShape: ({ id, center }) => createNote({ id, center }),
  resizable: true,
};
