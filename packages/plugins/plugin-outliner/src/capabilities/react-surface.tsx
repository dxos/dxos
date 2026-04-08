//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';

import { JournalContainer, OutlineCard, OutlineContainer, QuickEntryDialog } from '#containers';
import { QUICK_ENTRY_DIALOG, meta } from '#meta';
import { Journal, Outline } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.article.journal`,
        role: ['article', 'section'],
        filter: AppSurface.object(Journal.Journal, { attendable: true }),
        component: ({ role, data }) => (
          <JournalContainer role={role} subject={data.subject} attendableId={data.attendableId} showCalendar />
        ),
      }),
      Surface.create({
        id: `${meta.id}.article.outline`,
        role: ['article', 'section'],
        filter: AppSurface.object(Outline.Outline, { attendable: true }),
        component: ({ role, data }) => (
          <OutlineContainer role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.card.outline`,
        role: 'card--content',
        filter: AppSurface.object(Outline.Outline),
        component: ({ data }) => <OutlineCard subject={data.subject} />,
      }),
      Surface.create({
        id: QUICK_ENTRY_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(QUICK_ENTRY_DIALOG),
        component: () => <QuickEntryDialog />,
      }),
    ]),
  ),
);
