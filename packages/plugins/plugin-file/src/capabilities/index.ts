//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { FileCapabilities } from '#types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const EdgeBackend = Capability.lazyModule(
  'EdgeBackend',
  {
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./edge-backend'),
);
export const FileUploader = Capability.lazyModule(
  'FileUploader',
  {
    requires: [Capabilities.OperationInvoker],
    provides: [AppCapabilities.FileUploader],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./file-uploader'),
);
export const InlineBackend = Capability.lazyModule(
  'InlineBackend',
  { provides: [FileCapabilities.Backend], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./inline-backend'),
);
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.formInput', 'org.dxos.role.section', 'org.dxos.role.slide'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [FileCapabilities.SettingsAtom],
  activatesOn: ActivationEvents.DeferredStartup,
});
