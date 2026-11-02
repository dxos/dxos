//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type AddFeatureDialogProps } from './AddFeatureDialog/index.ts';
import { type FeatureArticleProps } from './FeatureArticle/index.ts';
import { type FeatureCardContentProps } from './FeatureCardContent/index.ts';
import {
  type FeatureCompanionProps,
  type FeatureLevelCompanionProps,
  type ProjectFeatureCompanionProps,
  type SpecLevelCompanionProps,
} from './FeatureCompanion/index.ts';
import {
  type FeatureLevelArticleProps,
  type FeatureLevelOverviewProps,
  type FeatureSpecViewProps,
} from './FeatureLevel/index.ts';
import { type FeatureSectionProps } from './FeatureSection/index.ts';
import { type FeatureMapArticleProps } from './SpecFeatures/index.ts';

export const AddFeatureDialog: ComponentType<AddFeatureDialogProps> = lazy(() =>
  import('./AddFeatureDialog/index.ts').then((module) => ({ default: module.AddFeatureDialog })),
);

export const CodeArticle: ComponentType<any> = lazy(() => import('./CodeArticle/index.ts'));
export const CodeSettings: ComponentType<any> = lazy(() => import('./CodeSettings/index.ts'));
export const FeatureArticle: ComponentType<FeatureArticleProps> = lazy(() =>
  import('./FeatureArticle/index.ts').then((module) => ({ default: module.FeatureArticle })),
);
export const FeatureCardContent: ComponentType<FeatureCardContentProps> = lazy(() =>
  import('./FeatureCardContent/index.ts').then((module) => ({ default: module.FeatureCardContent })),
);
export const FeatureCompanion: ComponentType<FeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.FeatureCompanion })),
);
export const FeatureLevelArticle: ComponentType<FeatureLevelArticleProps> = lazy(() =>
  import('./FeatureLevel/index.ts').then((module) => ({ default: module.FeatureLevelArticle })),
);
export const FeatureLevelCompanion: ComponentType<FeatureLevelCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.FeatureLevelCompanion })),
);
export const FeatureLevelOverview: ComponentType<FeatureLevelOverviewProps> = lazy(() =>
  import('./FeatureLevel/index.ts').then((module) => ({ default: module.FeatureLevelOverview })),
);
// Lazy: the canvas engine is large, and only a spec's map needs it.
export const FeatureMapArticle: ComponentType<FeatureMapArticleProps> = lazy(() =>
  import('./SpecFeatures/index.ts').then((module) => ({ default: module.FeatureMapArticle })),
);
export const FeatureSection: ComponentType<FeatureSectionProps> = lazy(() =>
  import('./FeatureSection/index.ts').then((module) => ({ default: module.FeatureSection })),
);
export const FeatureSpecView: ComponentType<FeatureSpecViewProps> = lazy(() =>
  import('./FeatureLevel/index.ts').then((module) => ({ default: module.FeatureSpecView })),
);
export const ProjectFeatureCompanion: ComponentType<ProjectFeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.ProjectFeatureCompanion })),
);
export const SpecArticle: ComponentType<any> = lazy(() => import('./SpecArticle/index.ts'));
export const SpecCompanion: ComponentType<any> = lazy(() => import('./SpecCompanion/index.ts'));
export const SpecLevelCompanion: ComponentType<SpecLevelCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.SpecLevelCompanion })),
);
