//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { SpaceCapability } from '@dxos/plugin-space';

import { SheetCapabilities } from '#types';

// Ordering-only: registers the sort comparator once the app graph exists; the body reads
// nothing else.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort'), {
  requires: [AppCapabilities.AppGraph],
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const ComputeGraphRegistry = Capability.lazyModule(
  'ComputeGraphRegistry',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [SheetCapabilities.ComputeGraphRegistry],
  },
  () => import('./compute-graph-registry'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SheetState = Capability.lazyModule(
  'SheetState',
  { provides: [SheetCapabilities.GridInstances] },
  () => import('./state'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'));
