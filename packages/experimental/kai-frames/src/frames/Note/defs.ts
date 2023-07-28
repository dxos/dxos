//
// Copyright 2023 DXOS.org
//

import { Cards as NoteIcon } from '@phosphor-icons/react';
import React from 'react';

import { NoteBoard } from '@dxos/kai-types';
import { Space } from '@dxos/react-client/echo';

import { FrameRuntime } from '../../registry';

const NoteFrame = React.lazy(() => import('./NoteFrame'));

export const NoteFrameRuntime: FrameRuntime<NoteBoard> = {
  Icon: NoteIcon,
  Component: NoteFrame,
  title: 'title',
  filter: () => NoteBoard.filter(),
  onCreate: async (space: Space) => {
    return space.db.add(new NoteBoard());
  },
};
