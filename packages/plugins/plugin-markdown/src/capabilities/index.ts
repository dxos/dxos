//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
export const AppGraphSerializer = Capability.lazy('AppGraphSerializer', () => import('./app-graph-serializer'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const IntentResolver = Capability.lazy('IntentResolver', () => import('./intent-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const MarkdownSettings = Capability.lazy('MarkdownSettings', () => import('./settings'));
export const MarkdownState = Capability.lazy('MarkdownState', () => import('./state'));
