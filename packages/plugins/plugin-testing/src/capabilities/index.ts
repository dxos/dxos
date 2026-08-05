//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Layout } from '#components';

import * as StorybookCapabilities from '../types/StorybookCapabilities';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactContext = Capability.inlineModule(
  'storybook-layout',
  // A context wraps the tree on its first render, so it cannot arrive in the idle wave.
  { activatesOn: ActivationEvents.Startup, provides: [Capabilities.ReactContext] },
  () =>
    Effect.succeed([
      Capability.contribute(Capabilities.ReactContext, {
        id: 'storybook-layout',
        context: Layout,
      }),
    ]),
);
export const State = Capability.lazyModule(
  'State',
  // Shell state read by `Layout` on its first render — same class as the deck's `DeckState`.
  { activatesOn: ActivationEvents.Startup, provides: [StorybookCapabilities.LayoutState, AppCapabilities.Layout] },
  () => import('./state'),
);
