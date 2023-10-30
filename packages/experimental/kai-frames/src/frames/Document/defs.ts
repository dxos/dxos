//
// Copyright 2023 DXOS.org
//

import { Article as DocumentIcon } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { type Space, TextObject, TextKind } from '@dxos/react-client/echo';

import { type FrameRuntime } from '../../registry';

const DocumentFrame = React.lazy(() => import('./DocumentFrame'));

export const DocumentFrameRuntime: FrameRuntime<Document> = {
  Icon: DocumentIcon,
  Component: DocumentFrame,
  title: 'title',
  filter: () => Document.filter(),
  onCreate: async (space: Space) => {
    return space.db.add(new Document({ content: new TextObject('', TextKind.RICH) }));
  },
};
