//
// Copyright 2026 DXOS.org
//

import { type ComponentType, type FunctionComponent, lazy } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import type { Project } from '@dxos/assistant-toolkit';

import type { ProjectArticleProps } from './ProjectArticle';

export const ProjectArticle: ComponentType<ProjectArticleProps> = lazy(() => import('./ProjectArticle'));

export const ProjectSettings: FunctionComponent<ObjectSurfaceProps<Project.Project>> = lazy(
  () => import('./ProjectSettings'),
);
