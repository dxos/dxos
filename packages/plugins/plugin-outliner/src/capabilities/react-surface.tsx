//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { MeetingType } from '@dxos/plugin-meeting/types';

import { JournalContainer, OutlinerContainer } from '../components';
import { OUTLINER_PLUGIN } from '../meta';
import { JournalType, OutlineType } from '../types';

const outlineTypename = getSchemaTypename(OutlineType)!;

export default () => [
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/journal`,
      role: ['article', 'section'],
      filter: (data): data is { subject: JournalType } => isInstanceOf(JournalType, data.subject),
      component: ({ data, role }) => <JournalContainer journal={data.subject} role={role} />,
    }),
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/outline`,
      role: ['article', 'section'],
      filter: (data): data is { subject: OutlineType } => isInstanceOf(OutlineType, data.subject),
      component: ({ data, role }) => {
        const outline = data.subject;
        return outline.tree.target ? <OutlinerContainer tree={outline.tree.target} role={role} /> : null;
      },
    }),
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/meeting-outline`,
      role: ['article', 'section'],
      filter: (data): data is { subject: MeetingType } =>
        isInstanceOf(MeetingType, data.subject) &&
        data.variant === outlineTypename &&
        isInstanceOf(OutlineType, data.subject.artifacts[outlineTypename].target),
      component: ({ data, role }) => {
        const outline = data.subject.artifacts[outlineTypename].target as OutlineType;
        return outline.tree.target ? <OutlinerContainer tree={outline.tree.target} role={role} /> : null;
      },
    }),
  ]),
];
