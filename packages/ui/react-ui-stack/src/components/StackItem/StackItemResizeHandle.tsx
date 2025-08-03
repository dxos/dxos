//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ResizeHandle } from '@dxos/react-ui-dnd';

import { useStack, useStackItem } from '../StackContext';

import { DEFAULT_EXTRINSIC_SIZE } from './StackItem';

const MIN_WIDTH = 20;
const MIN_HEIGHT = 3;

export type StackItemResizeHandleProps = {};

export const StackItemResizeHandle = () => {
  const { orientation } = useStack();
  const { setSize, size } = useStackItem();

  return (
    <ResizeHandle
      side={orientation === 'horizontal' ? 'inline-end' : 'block-end'}
      fallbackSize={DEFAULT_EXTRINSIC_SIZE}
      minSize={orientation === 'horizontal' ? MIN_WIDTH : MIN_HEIGHT}
      size={size}
      onSizeChange={setSize}
    />
  );
};
