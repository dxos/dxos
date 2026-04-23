//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

// Non-lazy capability exports mirror `index.ts` — the browser-only capabilities
// (react-surface, navigation-resolver, app-graph-builder, settings) are imported
// lazily so they never execute in a node context unless their activation event fires.
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const InboxSettings = Capability.lazy('InboxSettings', () => import('./settings'));
