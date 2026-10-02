//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import { type Task } from '@dxos/types';

import { MoveTaskDialog, ProjectArticle, ProjectArtifactsArticle, ProjectChatsArticle } from '#containers';
import { MOVE_TASK_DIALOG } from '#meta';

import { isArtifactsBranch, isChatsBranch } from '../capabilities/app-graph-builder.ts';

/** React surfaces contributed by plugin-projects — the Project detail article. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'project.article',
        filter: AppSurface.object(AppSurface.Article, Project.Project),
        component: ProjectArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // The virtual branches show what they contain, the way a database type node does: selecting
      // one is a request to see the set, not only to expand the tree.
      Surface.Root.create({
        id: 'project.chats',
        filter: AppSurface.subject(AppSurface.Article, isChatsBranch),
        component: ProjectChatsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, project: subject.project, attendableId }),
      }),
      Surface.Root.create({
        id: 'project.artifacts',
        filter: AppSurface.subject(AppSurface.Article, isArtifactsBranch),
        component: ProjectArtifactsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, project: subject.project, attendableId }),
      }),
      Surface.Root.create({
        id: MOVE_TASK_DIALOG,
        filter: AppSurface.component<{ task: Task.Task }>(AppSurface.Dialog, MOVE_TASK_DIALOG),
        component: MoveTaskDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
