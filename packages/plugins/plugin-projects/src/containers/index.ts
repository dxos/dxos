//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type FeatureArticleProps } from './FeatureArticle/index.ts';
import { type FeatureCardContentProps } from './FeatureCardContent/index.ts';
import { type FeatureCompanionProps } from './FeatureCompanion/index.ts';
import { type MoveTaskDialogProps } from './MoveTaskDialog/index.ts';
import { type ProjectBranchArticleProps } from './ProjectBranchArticle/index.ts';
import { type ProjectFeaturesProps } from './ProjectFeatures/index.ts';
import { type ShowcaseArticleProps } from './ShowcaseArticle/index.ts';
import { type ShowcaseCardContentProps } from './ShowcaseCardContent/index.ts';

export const FeatureArticle: ComponentType<FeatureArticleProps> = lazy(() =>
  import('./FeatureArticle/index.ts').then((module) => ({ default: module.FeatureArticle })),
);

export const FeatureCardContent: ComponentType<FeatureCardContentProps> = lazy(() =>
  import('./FeatureCardContent/index.ts').then((module) => ({ default: module.FeatureCardContent })),
);

export const FeatureCompanion: ComponentType<FeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.FeatureCompanion })),
);

// Lazy: the canvas engine is large, and only the Features tab needs it.
export const ProjectFeatures: ComponentType<ProjectFeaturesProps> = lazy(() =>
  import('./ProjectFeatures/index.ts').then((module) => ({ default: module.ProjectFeatures })),
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

export const ShowcaseArticle: ComponentType<ShowcaseArticleProps> = lazy(() =>
  import('./ShowcaseArticle/index.ts').then((module) => ({ default: module.ShowcaseArticle })),
);

export const ShowcaseCardContent: ComponentType<ShowcaseCardContentProps> = lazy(() =>
  import('./ShowcaseCardContent/index.ts').then((module) => ({ default: module.ShowcaseCardContent })),
);

export const MoveTaskDialog: ComponentType<MoveTaskDialogProps> = lazy(() =>
  import('./MoveTaskDialog/index.ts').then((module) => ({ default: module.MoveTaskDialog })),
);
