//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet, Skill } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { FileCapabilities } from '#types';

export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const EdgeBackend = Capability.lazyModule(
  'EdgeBackend',
  { requires: [ClientCapabilities.Client], provides: [FileCapabilities.Backend] },
  () => import('./edge-backend'),
);
export const FileUploader = Capability.lazyModule(
  'FileUploader',
  { requires: [Capabilities.OperationInvoker], provides: [AppCapabilities.FileUploader] },
  () => import('./file-uploader'),
);
export const InlineBackend = Capability.lazyModule(
  'InlineBackend',
  { provides: [FileCapabilities.Backend] },
  () => import('./inline-backend'),
);
export const Markdown = Capability.lazyModule(
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
export const Settings = Capability.lazyModule(
  'Settings',
  { provides: [FileCapabilities.SettingsAtom, AppCapabilities.Settings] },
  () => import('./settings'),
);
