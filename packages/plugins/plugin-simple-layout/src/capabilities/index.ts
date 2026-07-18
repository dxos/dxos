//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public aliases
// instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';

import { SimpleLayoutCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazyModule(
  'ReactRoot',
  { provides: [Capabilities.ReactRoot] },
  () => import('./react-root'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const SpotlightDismiss = Capability.lazyModule(
  'SpotlightDismiss',
  {
    provides: [],
    props: (options: { isPopover?: boolean }) => ({ isPopover: options.isPopover ?? false }),
  },
  () => import('./spotlight-dismiss'),
);
export const State = Capability.lazyModule(
  'State',
  {
    provides: [SimpleLayoutCapabilities.State, AppCapabilities.Layout],
    props: (options: { isPopover?: boolean }) => ({ initialState: { isPopover: options.isPopover ?? false } }),
  },
  () => import('./state'),
);
export const UrlHandler = Capability.lazyModule(
  'UrlHandler',
  {
    requires: [Capabilities.OperationInvoker, AppCapabilities.NavigationHandler, SimpleLayoutCapabilities.State],
    provides: [],
  },
  () => import('./url-handler'),
);
