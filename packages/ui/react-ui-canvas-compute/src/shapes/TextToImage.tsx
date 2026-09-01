//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { Box } from './common/index.ts';
import { type TextToImageShape } from './text-to-image-def.ts';

export const TextToImageComponent = ({ shape }: ShapeComponentProps<TextToImageShape>) => {
  return <Box shape={shape} />;
};
