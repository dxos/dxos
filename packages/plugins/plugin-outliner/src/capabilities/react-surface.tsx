//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability, createSurface } from '@dxos/app-framework';
import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';

import { JournalContainer, OutlineCard, OutlineContainer } from '../components';
import { meta } from '../meta';
import { Journal, Outline } from '../types';

export default Capability.makeModule(() => [
  Capability.contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/article/journal`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Journal.Journal } => Obj.instanceOf(Journal.Journal, data.subject),
      component: ({ role, data }) => (
        <JournalContainer role={role as SurfaceComponentProps['role']} subject={data.subject} />
      ),
    }),
    createSurface({
      id: `${meta.id}/article/outline`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Outline.Outline } => Obj.instanceOf(Outline.Outline, data.subject),
      component: ({ role, data }) => (
        <OutlineContainer role={role as SurfaceComponentProps['role']} subject={data.subject} />
      ),
    }),
    createSurface({
      id: `${meta.id}/card/outline`,
      role: ['card'],
      filter: (data): data is { subject: Outline.Outline } => Obj.instanceOf(Outline.Outline, data.subject),
      component: ({ data }) => <OutlineCard subject={data.subject} />,
    }),
  ]),
]);
