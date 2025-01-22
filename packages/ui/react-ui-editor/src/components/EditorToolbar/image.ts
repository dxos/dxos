//
// Copyright 2025 DXOS.org
//

import { createEditorAction } from './util';

const createImageAction = () =>
  createEditorAction(
    { type: 'image', testId: 'editor.toolbar.image' },
    'ph--image-square--regular',
    'upload image label',
  );

// TODO(wittjosiah): Factor out.
export const createImage = () => ({
  nodes: [createImageAction()],
  edges: [{ source: 'root', target: 'image' }],
});
