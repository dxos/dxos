//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { NativeFilesystemCapabilities } from '#types';

export * from './state';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    requires: [NativeFilesystemCapabilities.FilesystemManager],
    provides: [MarkdownCapabilities.ExtensionProvider],
  },
  () => import('./markdown-extension'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { requires: [NativeFilesystemCapabilities.State], provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
