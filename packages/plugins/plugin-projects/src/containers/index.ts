//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type MoveTaskDialogProps } from './MoveTaskDialog/index.ts';
import { type ProjectBranchArticleProps } from './ProjectBranchArticle/index.ts';

export const FeatureArticle: ComponentType<any> = lazy(() =>
  import('./FeatureArticle/index.ts').then((module) => ({ default: module.FeatureArticle })),
);

export const FeatureCardContent: ComponentType<any> = lazy(() =>
  import('./FeatureCardContent/index.ts').then((module) => ({ default: module.FeatureCardContent })),
);

export const FeatureMapArticle: ComponentType<any> = lazy(() =>
  import('./FeatureMapArticle/index.ts').then((module) => ({ default: module.FeatureMapArticle })),
);

export const ProjectArticle: ComponentType<any> = lazy(() =>
  import('./ProjectArticle/index.ts').then((module) => ({ default: module.ProjectArticle })),
);

export const ProjectChatsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle/index.ts').then((module) => ({ default: module.ProjectChatsArticle })),
);

export const ProjectArtifactsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle/index.ts').then((module) => ({ default: module.ProjectArtifactsArticle })),
);

export const ShowcaseArticle: ComponentType<any> = lazy(() =>
  import('./ShowcaseArticle/index.ts').then((module) => ({ default: module.ShowcaseArticle })),
);

export const ShowcaseCardContent: ComponentType<any> = lazy(() =>
  import('./ShowcaseCardContent/index.ts').then((module) => ({ default: module.ShowcaseCardContent })),
);

export const MoveTaskDialog: ComponentType<MoveTaskDialogProps> = lazy(() =>
  import('./MoveTaskDialog/index.ts').then((module) => ({ default: module.MoveTaskDialog })),
);
