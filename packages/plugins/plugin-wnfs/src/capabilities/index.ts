//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Blockstore = Capability.lazy('Blockstore', () => import('./blockstore'));
export const FileUploader = Capability.lazy('FileUploader', () => import('./file-uploader'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export * from './capabilities';
