//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { JournalContainer, OutlineCard, OutlineContainer, QuickEntryDialog } from '#containers';
import { QUICK_ENTRY_DIALOG } from '#meta';
import { Journal, Outline } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article.journal',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Journal.Journal),
        component: ({ role, data }) => (
          <JournalContainer role={role} subject={data.subject} attendableId={data.attendableId} showCalendar />
        ),
      }),
      Surface.create({
        id: 'article.outline',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Outline.Outline),
        component: ({ role, data }) => (
          <OutlineContainer role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'card.outline',
        role: 'card--content',
        filter: AppSurface.objectCard(Outline.Outline),
        component: ({ data }) => <OutlineCard subject={data.subject} />,
      }),
      Surface.create({
        id: QUICK_ENTRY_DIALOG,
        role: 'dialog',
        filter: AppSurface.componentDialog(QUICK_ENTRY_DIALOG),
        component: () => <QuickEntryDialog />,
      }),
    ]),
  ),
);
