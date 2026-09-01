//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AttentionCapabilities } from '#types';

export const Attention = Capability.lazyModule(
  'attention',
  {
    // App-shell state, so it must be on the startup pass rather than the idle default: the deck
    // and its planks read it through the STRICT `useCapability` hooks during their first render,
    // where a missing capability is an invariant violation and not a late-arriving value.
    activatesOn: ActivationEvents.Startup,
    requires: [Capabilities.AtomRegistry],
    provides: [AttentionCapabilities.Attention, AttentionCapabilities.ViewState],
  },
  () => import('./attention.ts'),
);
export const Keyboard = Capability.lazyModule(
  'Keyboard',
  { requires: [AppCapabilities.AppGraph, AttentionCapabilities.Attention], provides: [] },
  () => import('./keyboard.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const ReactContext = AppCapability.reactContext(() => import('./react-context.tsx'));
