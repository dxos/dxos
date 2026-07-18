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

import { PresenterCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  // Settings is read reactively inside the extension (with an empty fallback) rather than
  // required — the headless (node) variant has no settings module, and the graph should
  // still activate and fall back to the non-collections-presentable default.
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const PresenterSettings = Capability.lazyModule(
  'PresenterSettings',
  { provides: [PresenterCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
