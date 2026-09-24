//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as CrxCapabilities from '@dxos/plugin-crx/CrxCapabilities';
import * as CrxEvents from '@dxos/plugin-crx/CrxEvents';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { PreviewEvents } from '@dxos/plugin-preview';
import * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Connector = Capability.lazyModule(
  'GitHubConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);
// Browser-only: the editor it decorates and the popover it answers render nowhere else.
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start, environments: [] },
  () => import('./markdown-extension.ts'),
);
export const LinkResolver = Capability.lazyModule(
  'LinkResolver',
  { provides: [PreviewCapabilities.LinkResolver], activatesOn: PreviewEvents.Start, environments: [] },
  () => import('./link-resolver.ts'),
);
// Narrower than the `appGraphBuilder` family default: the action opens a dialog, which means
// nothing without an app shell.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: [],
});
export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
  () => import('./page-action.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.cardContent', 'org.dxos.role.cardMenu', 'org.dxos.role.article', 'org.dxos.role.dialog'],
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Translations = AppCapability.translations(translations);
