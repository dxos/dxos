//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { DXN } from '@dxos/keys';

import { JournalArticle, OutlineCard, OutlineArticle, QuickEntryDialog } from '#containers';
import { QUICK_ENTRY_DIALOG } from '#meta';
import { Journal, Outline } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.outliner.surface.articleJournal'),
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Journal.Journal),
          AppSurface.object(AppSurface.Section, Journal.Journal),
        ),
        component: ({ role, data }) => (
          <JournalArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.outliner.surface.articleOutline'),
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Outline.Outline),
          AppSurface.object(AppSurface.Section, Outline.Outline),
        ),
        component: ({ role, data }) => (
          <OutlineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.outliner.surface.cardOutline'),
        filter: AppSurface.object(AppSurface.Card, Outline.Outline),
        component: ({ data }) => <OutlineCard subject={data.subject} />,
      }),
      Surface.create({
        id: QUICK_ENTRY_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, QUICK_ENTRY_DIALOG),
        component: () => <QuickEntryDialog />,
      }),
    ]),
  ),
);
