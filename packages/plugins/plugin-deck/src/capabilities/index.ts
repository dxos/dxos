//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const CheckAppScheme = Capability.lazy('CheckAppScheme', () => import('./check-app-scheme'));
export const DeckSettings = Capability.lazy('DeckSettings', () => import('./settings'));
export const DeckState = Capability.lazy('DeckState', () => import('./state'));
export const LayoutIntentResolver = Capability.lazy('LayoutIntentResolver', () => import('./intent-resolver'));
export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
// export const Tools = Capability.lazy('Tools', () => import('./tools'));
export const Toolkit = Capability.lazy('Toolkit', () => import('./toolkit'));
export const UrlHandler = Capability.lazy('UrlHandler', () => import('./url-handler'));

export * from './capabilities';
export * from './state';
