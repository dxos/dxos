//
// Copyright 2025 DXOS.org
//

import { createEditorAction } from './util';

const createImageUploadAction = (onImageUpload: () => void) =>
  createEditorAction('image', onImageUpload, {
    testId: 'editor.toolbar.image',
    icon: 'ph--image-square--regular',
  });

export const createImageUpload = (onImageUpload: () => void) => ({
  nodes: [createImageUploadAction(onImageUpload)],
  edges: [{ source: 'root', target: 'image' }],
});
