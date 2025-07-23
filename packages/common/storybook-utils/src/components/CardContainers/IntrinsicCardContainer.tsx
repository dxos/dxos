//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren } from 'react';

import { ResizeHandle, resizeAttributes, sizeStyle, type Size } from '@dxos/react-ui-dnd';
import { Card } from '@dxos/react-ui-stack';

// Default size in rem
const DEFAULT_SIZE = 24;
const MIN_SIZE = 8;

export type IntrinsicCardContainerProps = PropsWithChildren<{
  defaultSize?: Size;
  size?: Size;
  onSizeChange?: (size: Size, commit?: boolean) => void;
}>;

export const IntrinsicCardContainer = ({
  children,
  defaultSize,
  size: propSize,
  onSizeChange,
}: IntrinsicCardContainerProps) => {
  const [size = DEFAULT_SIZE, setSize] = useControllableState<Size>({
    prop: propSize,
    defaultProp: defaultSize,
    onChange: onSizeChange,
  });

  return (
    <div
      className='relative border border-dashed border-subduedSeparator p-4 rounded-lg'
      style={sizeStyle(size, 'horizontal')}
      {...resizeAttributes}
    >
      <Card.StaticRoot>{children}</Card.StaticRoot>
      <ResizeHandle
        side='inline-end'
        fallbackSize={DEFAULT_SIZE}
        minSize={MIN_SIZE}
        size={size}
        onSizeChange={setSize}
      />
    </div>
  );
};
