//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { NativeFilesystemCapabilities } from '#types';

export * from './state';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    requires: [NativeFilesystemCapabilities.FilesystemManager],
    provides: [MarkdownCapabilities.ExtensionProvider],
  },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  requires: [NativeFilesystemCapabilities.State],
});
