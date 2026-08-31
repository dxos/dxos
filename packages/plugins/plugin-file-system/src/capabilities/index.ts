//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { FileSystemCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export * from './state';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [Capabilities.AtomRegistry, FileSystemCapabilities.State],
});
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    // `State` is declared alongside the manager because the provider callbacks read it and it is
    // contributed by this plugin's own idle-gated module, which markdown start can otherwise precede.
    requires: [FileSystemCapabilities.FileSystemManager, FileSystemCapabilities.State],
    provides: [MarkdownCapabilities.ExtensionProvider],
    activatesOn: MarkdownEvents.Start,
  },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  requires: [FileSystemCapabilities.State],
  roles: ['org.dxos.role.article'],
});
export const Translations = AppCapability.translations(translations);
