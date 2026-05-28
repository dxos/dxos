//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Blueprint } from '@dxos/compute';
import { OperationHandlerSet } from '@dxos/compute';

export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const FileUploader = Capability.lazy('FileUploader', () => import('./file-uploader'));
export const InlineBackend = Capability.lazy('InlineBackend', () => import('./inline-backend'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Settings = Capability.lazy('Settings', () => import('./settings'));
