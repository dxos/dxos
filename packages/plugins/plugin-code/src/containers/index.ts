//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { type FeatureArticleProps } from './FeatureArticle/index.ts';
import { type FeatureCardContentProps } from './FeatureCardContent/index.ts';
import { type FeatureCompanionProps, type ProjectFeatureCompanionProps } from './FeatureCompanion/index.ts';
import { type FeatureSectionProps } from './FeatureSection/index.ts';
import { type FeatureSpecViewProps } from './FeatureSpecView/index.ts';
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
export const FeatureSection: ComponentType<FeatureSectionProps> = lazy(() =>
  import('./FeatureSection/index.ts').then((module) => ({ default: module.FeatureSection })),
);
export const FeatureSpecView: ComponentType<FeatureSpecViewProps> = lazy(() =>
  import('./FeatureSpecView/index.ts').then((module) => ({ default: module.FeatureSpecView })),
);
export const ProjectFeatureCompanion: ComponentType<ProjectFeatureCompanionProps> = lazy(() =>
  import('./FeatureCompanion/index.ts').then((module) => ({ default: module.ProjectFeatureCompanion })),
);
export const SpecArticle: ComponentType<any> = lazy(() => import('./SpecArticle/index.ts'));
export const SpecSourceToolbar: ComponentType<SpecSource> = lazy(() =>
  import('./SpecArticle/index.ts').then((module) => ({ default: module.SpecSourceToolbar })),
);
export const SpecSourcesProvider: ProjectCapabilities.SpecSourcesProvider = lazy(() =>
  import('./SpecArticle/index.ts').then((module) => ({ default: module.SpecSourcesProvider })),
);
export const SpecViewContent: ComponentType<SpecViewContentProps> = lazy(() =>
  import('./SpecArticle/index.ts').then((module) => ({ default: module.SpecViewContent })),
);
