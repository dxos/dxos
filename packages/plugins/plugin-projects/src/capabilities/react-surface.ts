//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';

import { ProjectArticle, ProjectArtifactsArticle, ProjectChatsArticle, TaskCompanion } from '#containers';

import { isArtifactsBranch, isChatsBranch } from '../capabilities/app-graph-builder.ts';

/** React surfaces contributed by plugin-projects — the Project detail article. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'project.article',
        filter: AppSurface.object(AppSurface.Article, Project.Project),
        component: ProjectArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // The selected task beside the project, so reading the ledger never navigates away from it.
      Surface.create({
        id: 'project.taskCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'task'),
          AppSurface.companion(AppSurface.Article, Project.Project),
        ),
        component: TaskCompanion,
        props: ({ role, data: { companionTo, attendableId } }) => ({ role, project: companionTo, attendableId }),
      }),
      // The virtual branches show what they contain, the way a database type node does: selecting
      // one is a request to see the set, not only to expand the tree.
      Surface.create({
        id: 'project.chats',
        filter: AppSurface.subject(AppSurface.Article, isChatsBranch),
        component: ProjectChatsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, project: subject.project, attendableId }),
      }),
      Surface.create({
        id: 'project.artifacts',
        filter: AppSurface.subject(AppSurface.Article, isArtifactsBranch),
        component: ProjectArtifactsArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, project: subject.project, attendableId }),
      }),
    ]),
  ),
);
