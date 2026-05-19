//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const FileUploader = Capability.lazy('FileUploader', () => import('./file-uploader'));
export const Markdown = Capability.lazy('Markdown', () => import('./markdown'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
