//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Box, type ComputeNodeViewProps } from './common/index.ts';
import { type TextToImageShape } from './text-to-image-def.ts';

export const TextToImageComponent = ({ node: shape }: ComputeNodeViewProps<TextToImageShape>) => {
  return <Box shape={shape} />;
};
