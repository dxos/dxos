//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

export const Connector = Capability.lazyModule(
  'IbkrConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.objectProperties'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
