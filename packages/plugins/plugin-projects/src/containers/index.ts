//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type FeatureArticleProps } from './FeatureArticle/index.ts';
import { type FeatureCardContentProps } from './FeatureCardContent/index.ts';
import { type FeatureCompanionProps, type ProjectFeatureCompanionProps } from './FeatureCompanion/index.ts';
import { type MoveTaskDialogProps } from './MoveTaskDialog/index.ts';
import { type ProjectBranchArticleProps } from './ProjectBranchArticle/index.ts';
import { type SpecArticleProps } from './SpecFeatures/index.ts';

export const FeatureArticle: ComponentType<FeatureArticleProps> = lazy(() =>
  import('./FeatureArticle/index.ts').then((module) => ({ default: module.FeatureArticle })),
);

export const FeatureCardContent: ComponentType<FeatureCardContentProps> = lazy(() =>
  import('./FeatureCardContent/index.ts').then((module) => ({ default: module.FeatureCardContent })),
);

export const FeatureCompanion: ComponentType<FeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.FeatureCompanion })),
);

export const ProjectFeatureCompanion: ComponentType<ProjectFeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.ProjectFeatureCompanion })),
);

// Lazy: the canvas engine is large, and only a spec's map needs it.
export const SpecArticle: ComponentType<SpecArticleProps> = lazy(() =>
  import('./SpecFeatures/index.ts').then((module) => ({ default: module.SpecArticle })),
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

export const MoveTaskDialog: ComponentType<MoveTaskDialogProps> = lazy(() =>
  import('./MoveTaskDialog/index.ts').then((module) => ({ default: module.MoveTaskDialog })),
);
