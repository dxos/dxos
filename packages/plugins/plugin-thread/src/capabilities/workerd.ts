//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ThreadCapabilities, ThreadEvents } from '#types';

// Server-safe `#capabilities` barrel: only the modules the workerd entry activates. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares the React surface and
// a bundler follows the dynamic import behind a lazy capability — so importing it at all pulls React,
// and the `.pcss` assets behind it, into a worker bundle that cannot load them. The browser and node
// entries keep using the full barrel via their own conditions.

export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: ThreadEvents.Start },
  () => import('./channel-backend-feed'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const Schema = AppCapability.schema(() => import('./schema'));
