//
// Copyright 2026 DXOS.org
//

import { type ComponentType } from 'react';
import { lazy } from 'react';

import { type MoveTaskDialogProps } from './MoveTaskDialog/index.ts';
import { type ProjectBranchArticleProps } from './ProjectBranchArticle/index.ts';
import { type SpecCompanionPanelProps, type SpecCompanionProps, type SpecViewProps } from './SpecCompanion/index.ts';
import { type SpecDocumentArticleProps } from './SpecDocumentArticle/index.ts';

// Lazy: the editor engine is large, and only an opened spec document needs it.
export const SpecDocumentArticle: ComponentType<SpecDocumentArticleProps> = lazy(() =>
  import('./SpecDocumentArticle/index.ts').then((module) => ({ default: module.SpecDocumentArticle })),
);

export const SpecCompanion: ComponentType<SpecCompanionProps> = lazy(() =>
  import('./SpecCompanion/index.ts').then((module) => ({ default: module.SpecCompanion })),
);
export const SpecCompanionPanel: ComponentType<SpecCompanionPanelProps> = lazy(() =>
  import('./SpecCompanion/index.ts').then((module) => ({ default: module.SpecCompanionPanel })),
);

export const SpecView: ComponentType<SpecViewProps> = lazy(() =>
  import('./SpecCompanion/index.ts').then((module) => ({ default: module.SpecView })),
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
