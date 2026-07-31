//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { FileCapabilities } from '#types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
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
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [FileCapabilities.SettingsAtom],
});
