//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type ProjectBranchArticleProps } from './ProjectBranchArticle/index.ts';

export const ProjectArticle: ComponentType<any> = lazy(() =>
  import('./ProjectArticle/index.ts').then((module) => ({ default: module.ProjectArticle })),
);

export const ProjectChatsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle/index.ts').then((module) => ({ default: module.ProjectChatsArticle })),
);

export const ProjectArtifactsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle/index.ts').then((module) => ({ default: module.ProjectArtifactsArticle })),
);
