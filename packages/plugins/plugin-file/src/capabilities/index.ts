//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { FileCapabilities, FileEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node', 'workerd'],
});
export const EdgeBackend = Capability.lazyModule(
  'EdgeBackend',
  {
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    activatesOn: FileEvents.Start,
    environments: ['node', 'workerd'],
  },
  () => import('./edge-backend'),
);
export const FileUploader = Capability.lazyModule(
  'FileUploader',
  {
    requires: [Capabilities.OperationInvoker],
    provides: [AppCapabilities.FileUploader],
    activatesOn: FileEvents.Start,
  },
  () => import('./file-uploader'),
);
export const InlineBackend = Capability.lazyModule(
  'InlineBackend',
  { provides: [FileCapabilities.Backend], activatesOn: FileEvents.Start, environments: ['node', 'workerd'] },
  () => import('./inline-backend'),
);
// Browser-only: the `image` editor extension mounts a React tree into the CodeMirror widget via
// `react-dom/client`.
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start, environments: [] },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.formInput', 'org.dxos.role.section', 'org.dxos.role.slide'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [FileCapabilities.SettingsAtom],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
