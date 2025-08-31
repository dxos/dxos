//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, type Capability, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { JournalContainer, OutlinerContainer } from '../components';
import { OUTLINER_PLUGIN } from '../meta';
import { JournalType, OutlineType } from '../types';

export default (): Capability<any>[] => [
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/journal`,
      role: ['article', 'section'],
      filter: (data): data is { subject: JournalType } => Obj.instanceOf(JournalType, data.subject),
      component: ({ data, role }) => <JournalContainer journal={data.subject} role={role} />,
    }),
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/outline`,
      role: ['article', 'section'],
      filter: (data): data is { subject: OutlineType } => Obj.instanceOf(OutlineType, data.subject),
      component: ({ data, role }) => {
        return <OutlinerContainer outline={data.subject} role={role} />;
      },
    }),
  ]),
];
