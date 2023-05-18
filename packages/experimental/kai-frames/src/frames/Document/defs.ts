//
// Copyright 2023 DXOS.org
//

import { Article as DocumentIcon } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { Space } from '@dxos/client';
import { Text } from '@dxos/echo-schema';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

import { FrameRuntime } from '../../registry';

const DocumentFrame = React.lazy(() => import('./DocumentFrame'));

export const DocumentFrameRuntime: FrameRuntime<Document> = {
  Icon: DocumentIcon,
  Component: DocumentFrame,
  title: 'title',
  filter: () => Document.filter(),
  onCreate: async (space: Space) => {
    return space.db.add(new Document({ content: new Text('', TextKind.RICH) }));
  },
};
