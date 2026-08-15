//
// GENERATED — do not edit
// AST-sliced from src/capabilities/index.ts for the 'workerd' environment.
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ThreadCapabilities, ThreadEvents } from '#types';

export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  { provides: [ThreadCapabilities.ChannelBackend], activatesOn: ThreadEvents.Start },
  () => import('./channel-backend-feed'),
);

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});

export const Schema = AppCapability.schema(() => import('./schema'));

export const AppGraphBuilder = undefined;
export const CreateObject = undefined;
export const ReactSurface = undefined;
