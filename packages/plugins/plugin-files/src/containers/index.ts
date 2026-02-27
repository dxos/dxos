//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ExportStatus: ComponentType<any> = lazy(() => import('./ExportStatus'));
export const FilesSettings: ComponentType<any> = lazy(() => import('./FilesSettings'));
export const LocalFileContainer: ComponentType<any> = lazy(() => import('./LocalFileContainer'));
