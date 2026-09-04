//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type ProjectBranchArticleProps } from './ProjectBranchArticle';

export const ProjectArticle: ComponentType<any> = lazy(() =>
  import('./ProjectArticle').then((module) => ({ default: module.ProjectArticle })),
);

export const ProjectChatsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle').then((module) => ({ default: module.ProjectChatsArticle })),
);

export const ProjectArtifactsArticle: ComponentType<ProjectBranchArticleProps> = lazy(() =>
  import('./ProjectBranchArticle').then((module) => ({ default: module.ProjectArtifactsArticle })),
);
