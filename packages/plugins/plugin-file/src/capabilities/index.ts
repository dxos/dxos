//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { FileCapabilities, FileEvents } from '#types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const EdgeBackend = Capability.lazyModule(
  'EdgeBackend',
  {
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    activatesOn: FileEvents.Start,
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
  { provides: [FileCapabilities.Backend], activatesOn: FileEvents.Start },
  () => import('./inline-backend'),
);
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: FileEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.formInput', 'org.dxos.role.section', 'org.dxos.role.slide'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [FileCapabilities.SettingsAtom],
  activatesOn: FileEvents.Start,
});
