//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type ProjectFolderProps } from './ProjectFolder/ProjectFolder.tsx';
import { type ProjectRepositoriesProps } from './ProjectRepositories/ProjectRepositories.tsx';

export const ProjectFolder: ComponentType<ProjectFolderProps> = lazy(() => import('./ProjectFolder/index.ts'));
export const ProjectRepositories: ComponentType<ProjectRepositoriesProps> = lazy(
  () => import('./ProjectRepositories/index.ts'),
);
