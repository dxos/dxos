//
// Copyright 2025 DXOS.org
//

import { type Node } from '@dxos/app-graph';

import { createEditorMenuAction } from './actions';

const createImageUploadAction = (onImageUpload: () => void) =>
  createEditorMenuAction(
    'image',
    {
      testId: 'editor.toolbar.image',
      icon: 'ph--image-square--regular',
    },
    onImageUpload,
  );

export const createImageUpload = (
  onImageUpload: () => void,
): {
  nodes: Node.NodeArg<any>[];
  edges: Array<{ source: string; target: string; relation: 'child' }>;
} => ({
  nodes: [createImageUploadAction(onImageUpload)],
  edges: [{ source: 'root', target: 'image', relation: 'child' }],
});
