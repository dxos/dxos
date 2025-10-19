//
// Copyright 2025 DXOS.org
//

import { type ResizeHandleProps } from '../components';
import { type Size } from '../types';

export const sizeStyle = (
  size: Size,
  sideOrOrientation: ResizeHandleProps['side'] | 'horizontal' | 'vertical',
  // TODO(thure): This is an experimental feature under evaluation; remove if the default should become `true`.
  calcSize?: boolean,
) => {
  let sizeProperty = 'inlineSize';
  switch (sideOrOrientation) {
    case 'vertical':
    case 'block-start':
    case 'block-end':
      sizeProperty = 'blockSize';
  }

  return {
    [sizeProperty]: size === 'min-content' ? (calcSize ? 'var(--dx-calc-min)' : 'min-content') : `${size}rem`,
  };
};
