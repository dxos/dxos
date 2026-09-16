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

import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';
import { meta } from '../meta.ts';

export const Connector = Capability.lazyModule(
  'IbkrConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  requires: [AttentionCapabilities.ViewState],
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.objectProperties'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
