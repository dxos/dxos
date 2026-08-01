//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { SheetCapabilities, SheetEvents } from '#types';

// Ordering-only: registers the sort comparator once the app graph exists; the body reads
// nothing else.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort'), {
  requires: [AppCapabilities.AppGraph],
  activatesOn: SheetEvents.Start,
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: SheetEvents.Start,
});
export const ComputeGraphRegistry = Capability.lazyModule(
  'ComputeGraphRegistry',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [SheetCapabilities.ComputeGraphRegistry],
    activatesOn: SheetEvents.Start,
  },
  () => import('./compute-graph-registry'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider], activatesOn: MarkdownEvents.Start },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: SheetEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties', 'org.dxos.role.section'],
});
export const SheetState = Capability.lazyModule(
  'SheetState',
  { provides: [SheetCapabilities.GridInstances], activatesOn: SheetEvents.Start },
  () => import('./state'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  activatesOn: SheetEvents.Start,
});
