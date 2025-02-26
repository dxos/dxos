//
// Copyright 2025 DXOS.org
//

import { type ResizeHandleProps } from '../components';
import { type Size } from '../types';

export const sizeStyle = (size: Size, sideOrOrientation: ResizeHandleProps['side'] | 'horizontal' | 'vertical') => {
  switch (sideOrOrientation) {
    case 'horizontal':
    case 'inline-start':
    case 'inline-end':
      return { inlineSize: size === 'min-content' ? size : `${size}rem` };
    case 'vertical':
    case 'block-start':
    case 'block-end':
      return { blockSize: size === 'min-content' ? size : `${size}rem` };
  }
};
