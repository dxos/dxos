//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export type { ProjectContainerProps } from './ProjectContainer';
export type { ProjectObjectSettingsProps } from './ProjectSettings';

export const ProjectContainer = lazy(() => import('./ProjectContainer'));
export const ProjectObjectSettings = lazy(() => import('./ProjectSettings'));
