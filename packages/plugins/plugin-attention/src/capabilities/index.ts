//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AttentionCapabilities } from '#types';

export const Attention = Capability.lazyModule(
  'attention',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AttentionCapabilities.Attention, AttentionCapabilities.ViewState],
  },
  () => import('./attention'),
);
export const Keyboard = Capability.lazyModule(
  'Keyboard',
  { requires: [AppCapabilities.AppGraph, AttentionCapabilities.Attention], provides: [] },
  () => import('./keyboard'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactContext = AppCapability.reactContext(() => import('./react-context'));
