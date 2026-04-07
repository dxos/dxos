//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/operation';

export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
export const ComputeGraphRegistry = Capability.lazy('ComputeGraphRegistry', () => import('./compute-graph-registry'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SheetState = Capability.lazy('SheetState', () => import('./state'));
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
