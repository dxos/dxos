//
// Copyright 2025 DXOS.org
//

import { type ActionGroupBuilderFn } from '@dxos/react-ui-menu';

import { translationKey } from '../../translations';

/** Add image upload action to the builder. */
export const addImageUpload =
  (onImageUpload: () => void): ActionGroupBuilderFn =>
  (builder) => {
    builder.action(
      'image',
      {
        label: ['image.label', { ns: translationKey }],
        testId: 'editor.toolbar.image',
        icon: 'ph--image-square--regular',
      },
      onImageUpload,
    );
  };
