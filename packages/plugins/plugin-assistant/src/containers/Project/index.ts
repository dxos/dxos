//
// Copyright 2026 DXOS.org
//

import { type ComponentType, type FunctionComponent, lazy } from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import type { Project } from '@dxos/assistant-toolkit';

import type { ProjectArticleProps } from './ProjectArticle';

export const ProjectArticle: ComponentType<ProjectArticleProps> = lazy(() => import('./ProjectArticle'));

export const ProjectSettings: FunctionComponent<AppSurface.ObjectProps<Project.Project>> = lazy(
  () => import('./ProjectSettings'),
);
