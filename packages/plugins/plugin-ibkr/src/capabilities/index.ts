//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { IbkrEvents } from '../types';

export const Connector = Capability.lazyModule(
  'IbkrConnector',
  { provides: [ConnectorCapability], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: IbkrEvents.Start,
});
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
  activatesOn: IbkrEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: IbkrEvents.Start,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
