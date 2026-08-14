//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { ConnectorEvents, ConnectorSpec } from '#types';

export * from './connector-coordinator';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [ConnectorSpec.Connector],
});
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connectors'),
);
export const Commands = AppCapability.commands(() => import('./commands'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
// CreateRoutine (plugin-routine's OperationHandler) resolves RoutineCapabilities.Template, so the
// sync template must be registered on node too (e.g. CLI-driven creation).
export const RoutineTemplate = Capability.lazyModule(
  'RoutineTemplate',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./routine-template'),
);

export const Schema = AppCapability.schema(() => import('./schema'));
