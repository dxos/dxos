//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const Connector = Capability.lazyModule(
  'TrelloConnector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
