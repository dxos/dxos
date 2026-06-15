//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

// The contributed capability type references Blueprint types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const BlueprintDefinition: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
> = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const FileUploader = Capability.lazy('FileUploader', () => import('./file-uploader'));
export const InlineBackend = Capability.lazy('InlineBackend', () => import('./inline-backend'));
export const Markdown = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
