//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { SpaceCapability } from '@dxos/plugin-space';

export const Connector = Capability.lazyModule(
  'IbkrConnector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
