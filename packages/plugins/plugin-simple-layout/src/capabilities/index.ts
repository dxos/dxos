//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

import { SimpleLayoutCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
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
