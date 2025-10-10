//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type ProjectContainerProps } from './ProjectContainer';
import { type ProjectSettingsProps } from './ProjectSettings';

export const ProjectContainer = lazy<ComponentType<ProjectContainerProps>>(() => import('./ProjectContainer'));
export const ProjectSettings = lazy<ComponentType<ProjectSettingsProps>>(() => import('./ProjectSettings'));
