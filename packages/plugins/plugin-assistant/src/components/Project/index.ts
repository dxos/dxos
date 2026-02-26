//
// Copyright 2026 DXOS.org
//

import { type ComponentType, type FunctionComponent, lazy } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import type { Project } from '@dxos/assistant-toolkit';

import type { ProjectArticleProps } from './ProjectArticle';

export const ProjectArticle: ComponentType<ProjectArticleProps> = lazy(() => import('./ProjectArticle'));

export const ProjectSettings: FunctionComponent<SurfaceComponentProps<Project.Project>> = lazy(
  () => import('./ProjectSettings'),
);
