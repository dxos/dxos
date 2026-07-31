//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { Connector } from '#types';

export * from './connector-coordinator';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [Connector], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const BuiltinConnectors = Capability.lazyModule(
  'BuiltinConnectors',
  { provides: [Connector] },
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
