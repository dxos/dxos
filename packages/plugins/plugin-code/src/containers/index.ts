//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

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
  type FeatureSpecCompanionProps,
  type FeatureSpecViewProps,
} from './FeatureLevel/index.ts';
import { type FeatureSectionProps } from './FeatureSection/index.ts';
import { type SpecViewContentProps } from './SpecArticle/SpecPanel.tsx';
import { type SpecSource } from './SpecArticle/useSpecModel.ts';

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
export const FeatureSection: ComponentType<FeatureSectionProps> = lazy(() =>
  import('./FeatureSection/index.ts').then((module) => ({ default: module.FeatureSection })),
);
export const FeatureSpecCompanion: ComponentType<FeatureSpecCompanionProps> = lazy(() =>
  import('./FeatureLevel/index.ts').then((module) => ({ default: module.FeatureSpecCompanion })),
);
export const FeatureSpecView: ComponentType<FeatureSpecViewProps> = lazy(() =>
  import('./FeatureLevel/index.ts').then((module) => ({ default: module.FeatureSpecView })),
);
export const ProjectFeatureCompanion: ComponentType<ProjectFeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.ProjectFeatureCompanion })),
);
export const SpecArticle: ComponentType<any> = lazy(() => import('./SpecArticle/index.ts'));
export const SpecLevelCompanion: ComponentType<SpecLevelCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.SpecLevelCompanion })),
);
export const SpecSourceToolbar: ComponentType<SpecSource> = lazy(() =>
  import('./SpecArticle/index.ts').then((module) => ({ default: module.SpecSourceToolbar })),
);
export const SpecSourcesProvider: ProjectCapabilities.SpecSourcesProvider = lazy(() =>
  import('./SpecArticle/index.ts').then((module) => ({ default: module.SpecSourcesProvider })),
);
export const SpecViewContent: ComponentType<SpecViewContentProps> = lazy(() =>
  import('./SpecArticle/index.ts').then((module) => ({ default: module.SpecViewContent })),
);
