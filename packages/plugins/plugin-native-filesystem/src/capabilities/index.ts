//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';

import { NativeFilesystemCapabilities, NativeFilesystemEvents } from '#types';

export * from './state';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [Capabilities.AtomRegistry, NativeFilesystemCapabilities.State],
  activatesOn: NativeFilesystemEvents.Start,
});
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    requires: [NativeFilesystemCapabilities.FilesystemManager],
    provides: [MarkdownCapabilities.ExtensionProvider],
    activatesOn: MarkdownEvents.Start,
  },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: NativeFilesystemEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  requires: [NativeFilesystemCapabilities.State],
  activatesOn: NativeFilesystemEvents.Start,
});
