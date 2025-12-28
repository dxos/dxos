//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const FileSettings = Capability.lazy('FileSettings', () => import('./settings'));
export const FileState = Capability.lazy('FileState', () => import('./state'));

export * from './capabilities';
