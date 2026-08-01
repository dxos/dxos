//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { NativeFilesystemCapabilities } from '#types';

export * from './state';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [Capabilities.AtomRegistry, NativeFilesystemCapabilities.State],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    requires: [NativeFilesystemCapabilities.FilesystemManager],
    provides: [MarkdownCapabilities.ExtensionProvider],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  requires: [NativeFilesystemCapabilities.State],
  activatesOn: ActivationEvents.DeferredStartup,
});
