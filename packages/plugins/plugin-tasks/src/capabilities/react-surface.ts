//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Role from '@dxos/app-framework/Role';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Outline, RemoteSession, Task, TaskSet, type TaskSet as TaskSetType } from '@dxos/types';
import { Position } from '@dxos/util';

import {
  JournalArticle,
  OutlineArticle,
  OutlineCard,
  QuickEntryDialog,
  RemoteSessionCard,
  TaskArticle,
  TaskSetArticle,
} from '#containers';
import { QUICK_ENTRY_DIALOG } from '#meta';
import { Journal } from '#types';

/**
 * The section role, typed for an embedded outline: same NSID (role identity is structural), plus the
 * optional `taskSet` an embedder passes so promoted items are filed into ITS ledger rather than the
 * outline's own — a project's inline outline promotes into the project's task set.
 */
const OutlineSection: Role.Role<AppSurface.SectionData<Outline.Outline, { taskSet?: TaskSetType.TaskSet }>> =
  Role.make('org.dxos.role.section');

/**
 * The section role, typed for an embedded task set: the host says where a row opens its task, since
 * only the host knows whether it contributes a companion to open into.
 */
const TaskSetSection: Role.Role<AppSurface.SectionData<TaskSetType.TaskSet, { detail?: 'plank' | 'companion' }>> =
  Role.make('org.dxos.role.section');

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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
        id: 'card.remoteSession',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, RemoteSession.RemoteSession),
        component: RemoteSessionCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'article.outline',
        filter: AppSurface.object(AppSurface.Article, Outline.Outline),
        component: OutlineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        // Its own surface rather than a second filter on the article: only the embedded (section) case
        // carries `taskSet`, and a union data type could not destructure it.
        id: 'section.outline',
        filter: AppSurface.object(OutlineSection, Outline.Outline),
        component: OutlineArticle,
        // No toolbar when embedded: the host surface (e.g. `ProjectArticle`) owns the toolbar, and a
        // second one inside its section reads as a nested editor.
        props: ({ role, data: { subject, attendableId, taskSet } }) => ({
          role,
          subject,
          attendableId,
          taskSet,
          toolbar: false,
        }),
      }),
      Surface.create({
        // A single task's detail: the plank a row opens, reused as the reader moves down a list.
        id: 'article.task',
        filter: AppSurface.object(AppSurface.Article, Task.Task),
        component: TaskArticle,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'article.taskSet',
        filter: AppSurface.object(AppSurface.Article, TaskSet.TaskSet),
        component: TaskSetArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // Embedded in a host (the project's Tasks tab), which also says where a row opens its task:
      // only the host knows whether it contributes a companion to open into.
      Surface.create({
        id: 'section.taskSet',
        filter: AppSurface.object(TaskSetSection, TaskSet.TaskSet),
        component: TaskSetArticle,
        props: ({ role, data: { subject, attendableId, detail } }) => ({ role, subject, attendableId, detail }),
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
