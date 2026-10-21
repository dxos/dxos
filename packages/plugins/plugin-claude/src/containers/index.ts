//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type ProjectFolderProps } from './ProjectFolder/ProjectFolder.tsx';

export const ProjectFolder: ComponentType<ProjectFolderProps> = lazy(() => import('./ProjectFolder/index.ts'));
