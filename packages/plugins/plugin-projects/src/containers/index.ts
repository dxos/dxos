//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type MoveTaskDialogProps } from './MoveTaskDialog/index.ts';
import { type ProjectBranchArticleProps } from './ProjectBranchArticle/index.ts';

export const ProjectArticle: ComponentType<any> = lazy(() =>
  import('./ProjectArticle/index.ts').then((module) => ({ default: module.ProjectArticle })),
);

export const ProjectTaskCompanion: ComponentType<any> = lazy(() =>
  import('./ProjectTaskCompanion/index.ts').then((module) => ({ default: module.ProjectTaskCompanion })),
);

export const ProjectChatsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle/index.ts').then((module) => ({ default: module.ProjectChatsArticle })),
);

export const ProjectArtifactsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle/index.ts').then((module) => ({ default: module.ProjectArtifactsArticle })),
);

export const MoveTaskDialog: ComponentType<MoveTaskDialogProps> = lazy(() =>
  import('./MoveTaskDialog/index.ts').then((module) => ({ default: module.MoveTaskDialog })),
);
