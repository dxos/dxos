//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { SheetCapabilities } from '#types';

// Ordering-only: registers the sort comparator once the app graph exists; the body reads
// nothing else.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort'), {
  requires: [AppCapabilities.AppGraph],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ComputeGraphRegistry = Capability.lazyModule(
  'ComputeGraphRegistry',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [SheetCapabilities.ComputeGraphRegistry],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./compute-graph-registry'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties', 'org.dxos.role.section'],
});
export const SheetState = Capability.lazyModule(
  'SheetState',
  { provides: [SheetCapabilities.GridInstances], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./state'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
