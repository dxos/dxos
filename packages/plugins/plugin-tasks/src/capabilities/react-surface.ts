//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Outline, TaskSet } from '@dxos/types';

import { JournalArticle, OutlineArticle, OutlineCard, QuickEntryDialog, TaskSetArticle } from '#containers';
import { QUICK_ENTRY_DIALOG } from '#meta';
import { Journal } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article.journal',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Journal.Journal),
          AppSurface.object(AppSurface.Section, Journal.Journal),
        ),
        component: JournalArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'article.outline',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Outline.Outline),
          AppSurface.object(AppSurface.Section, Outline.Outline),
        ),
        component: OutlineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'article.task-set',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, TaskSet.TaskSet),
          AppSurface.object(AppSurface.Section, TaskSet.TaskSet),
        ),
        component: TaskSetArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'card.outline',
        filter: AppSurface.object(AppSurface.CardContent, Outline.Outline),
        component: OutlineCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.create({
        id: QUICK_ENTRY_DIALOG,
        filter: AppSurface.component(AppSurface.Dialog, QUICK_ENTRY_DIALOG),
        component: QuickEntryDialog,
      }),
    ]),
  ),
);
