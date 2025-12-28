//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
export const ComputeGraphRegistry = Capability.lazy('ComputeGraphRegistry', () => import('./compute-graph-registry'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export * from './capabilities';
