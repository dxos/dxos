//
// Copyright 2026 DXOS.org
//

import { type FunctionComponent, lazy } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import type { Project } from '@dxos/assistant-toolkit';

import type { ProjectContainerProps } from './ProjectContainer';

export const ProjectContainer: FunctionComponent<ProjectContainerProps> = lazy(() => import('./ProjectContainer'));

export const ProjectSettings: FunctionComponent<SurfaceComponentProps<Project.Project>> = lazy(
  () => import('./ProjectSettings'),
);
