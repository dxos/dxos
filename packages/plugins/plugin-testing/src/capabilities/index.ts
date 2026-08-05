//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';

import { Layout } from '#components';
import { StorybookCapabilities } from '#types';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactContext = Capability.inlineModule('storybook-layout', { provides: [Capabilities.ReactContext] }, () =>
  Effect.succeed([
    Capability.contribute(Capabilities.ReactContext, {
      id: 'storybook-layout',
      context: Layout,
    }),
  ]),
);
export const State = Capability.lazyModule(
  'State',
  { provides: [StorybookCapabilities.LayoutState, AppCapabilities.Layout] },
  () => import('./state'),
);
