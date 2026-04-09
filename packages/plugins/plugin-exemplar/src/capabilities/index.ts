//
// Copyright 2025 DXOS.org
//

// Capabilities barrel with lazy-loaded modules.
// `Capability.lazy()` defers module loading until the framework activates the module.
// This enables code-splitting: the graph builder, surfaces, and settings modules
// are only loaded when their activation events fire.
// The string argument is a debug tag used in error messages and tracing.

import { Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/operation';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));

export const ExemplarSettings = Capability.lazy('ExemplarSettings', () => import('./settings'));
