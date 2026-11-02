//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { type Task } from '@dxos/types';
import * as Position from '@dxos/util/Position';

import {
  LevelArticle,
  MoveTaskDialog,
  ProjectArticle,
  ProjectArtifactsArticle,
  ProjectChatsArticle,
  SpecDocumentArticle,
  SpecLevelArticle,
} from '#containers';
import { ProjectView } from '#types';

import { isArtifactsBranch, isChatsBranch } from '../capabilities/app-graph-builder.ts';
import { MOVE_TASK_DIALOG } from '../constants.ts';

/** A spec a project owns is a level of the project: the project article on that spec. */
const isProjectSpec = (value: unknown): value is Spec.Spec =>
  Spec.instanceOf(value) && Project.getOwner(value) !== undefined;

/** React surfaces contributed by plugin-projects — articles for projects, their specs and their branches. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'project.article',
        filter: AppSurface.object(AppSurface.Article, Project.Project),
        component: ProjectArticle,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      // A level another plugin nests beneath a spec, which it renders through this role.
      Surface.create({
        id: 'project.level',
        filter: Surface.makeFilter(ProjectView.Level),
        component: LevelArticle,
        props: ({ data }) => data,
      }),
      Surface.create({
        id: 'spec.level',
        filter: AppSurface.object(AppSurface.Article, Spec.Spec, ({ subject }) => isProjectSpec(subject)),
        component: SpecLevelArticle,
        props: ({ role, data }) => ({ role, ...data }),
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
      // The spec's text, which its Document view embeds; last, so a richer section can take its place.
      Surface.create({
        id: 'spec.section',
        filter: AppSurface.object(AppSurface.Section, Spec.Spec),
        component: SpecDocumentArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        position: Position.last,
      }),
      Surface.create({
        id: MOVE_TASK_DIALOG,
        filter: AppSurface.component<{ task: Task.Task }>(AppSurface.Dialog, MOVE_TASK_DIALOG),
        component: MoveTaskDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
