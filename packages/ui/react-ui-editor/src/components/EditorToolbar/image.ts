//
// Copyright 2025 DXOS.org
//

import { createEditorAction } from './actions';

const createImageUploadAction = (onImageUpload: () => void) =>
  createEditorAction(
    'image',
    {
      testId: 'editor.toolbar.image',
      icon: 'ph--image-square--regular',
    },
    onImageUpload,
  );

export const createImageUpload = (onImageUpload: () => void) => ({
  nodes: [createImageUploadAction(onImageUpload)],
  edges: [{ source: 'root', target: 'image' }],
});
