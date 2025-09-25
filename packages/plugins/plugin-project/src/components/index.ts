//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type DataType } from '@dxos/schema';

export const ProjectContainer = lazy<ComponentType<{ project: DataType.Project; role: string }>>(
  () => import('./ProjectContainer'),
);
export const ProjectSettings = lazy<ComponentType<{ project: DataType.Project }>>(() => import('./ProjectSettings'));
