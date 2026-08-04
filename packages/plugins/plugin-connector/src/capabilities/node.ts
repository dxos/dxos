//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import * as ConnectorSpec from '../types/ConnectorSpec';

export * from './connector-coordinator';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [ConnectorSpec.Connector], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [ConnectorSpec.Connector] },
  () => import('./connectors'),
);
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
