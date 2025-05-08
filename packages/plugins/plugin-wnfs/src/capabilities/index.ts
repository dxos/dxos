//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const Blockstore = lazy(() => import('./blockstore'));
export const FileUploader = lazy(() => import('./file-uploader'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const Markdown = lazy(() => import('./markdown'));
export const ReactSurface = lazy(() => import('./react-surface'));

export * from './capabilities';
