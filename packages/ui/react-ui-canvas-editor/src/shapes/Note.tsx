//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ShapeComponentProps, TextBox } from '../components';
import { type NoteShape } from '../types';

export const NoteComponent = ({ shape }: ShapeComponentProps<NoteShape>) => {
  const { text } = shape;
  return <TextBox value={text} placeholder='Note...' />;
};
