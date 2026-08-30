//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

export const ProjectArticle: ComponentType<any> = lazy(() =>
  import('./ProjectArticle').then((module) => ({ default: module.ProjectArticle })),
);

export const ProjectChatsArticle: ComponentType<any> = lazy(() =>
  import('./ProjectBranchArticle').then((module) => ({ default: module.ProjectChatsArticle })),
);

export const ProjectArtifactsArticle: ComponentType<any> = lazy(() =>
  import('./ProjectBranchArticle').then((module) => ({ default: module.ProjectArtifactsArticle })),
);
