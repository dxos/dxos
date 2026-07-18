//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation, OperationHandlerSet, Skill } from '@dxos/compute';
import { ClientCapabilities } from '@dxos/plugin-client';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { SheetCapabilities } from '#types';

export const AnchorSort = Capability.lazyModule(
  'AnchorSort',
  // Ordering-only: registers the sort comparator once the app graph exists; the body reads
  // nothing else.
  { requires: [AppCapabilities.AppGraph], provides: [AppCapabilities.AnchorSort] },
  () => import('./anchor-sort'),
);
export const CommentConfig = Capability.lazyModule(
  'CommentConfig',
  { provides: [AppCapabilities.CommentConfig] },
  () => import('./comment-config'),
);
export const ComputeGraphRegistry = Capability.lazyModule(
  'ComputeGraphRegistry',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [SheetCapabilities.ComputeGraphRegistry],
  },
  () => import('./compute-graph-registry'),
);
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
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
export const SheetState = Capability.lazyModule(
  'SheetState',
  { provides: [SheetCapabilities.GridInstances] },
  () => import('./state'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  { provides: [Capabilities.UndoMapping] },
  () => import('./undo-mappings'),
);
