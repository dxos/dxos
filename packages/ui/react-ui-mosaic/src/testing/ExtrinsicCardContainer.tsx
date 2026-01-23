//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren } from 'react';

import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';

// Default size in rem.
const DEFAULT_INLINE_SIZE = 24;
const MIN_INLINE_SIZE = 8;
const DEFAULT_BLOCK_SIZE = 24;
const MIN_BLOCK_SIZE = 8;

export type ExtrinsicCardContainerProps = PropsWithChildren<{
  defaultInlineSize?: Size;
  inlineSize?: Size;
  defaultBlockSize?: Size;
  blockSize?: Size;
  onInlineSizeChange?: (size: Size, commit?: boolean) => void;
  onBlockSizeChange?: (size: Size, commit?: boolean) => void;
}>;

export const ExtrinsicCardContainer = ({
  children,
  defaultInlineSize,
  inlineSize: propInlineSize,
  defaultBlockSize,
  blockSize: propBlockSize,
  onInlineSizeChange,
  onBlockSizeChange,
}: ExtrinsicCardContainerProps) => {
  const [inlineSize = DEFAULT_INLINE_SIZE, setInlineSize] = useControllableState<Size>({
    prop: propInlineSize,
    defaultProp: defaultInlineSize,
    onChange: onInlineSizeChange,
  });

  const [blockSize = DEFAULT_BLOCK_SIZE, setBlockSize] = useControllableState<Size>({
    prop: propBlockSize,
    defaultProp: defaultBlockSize,
    onChange: onBlockSizeChange,
  });

  return (
    <div
      className='grid relative border border-dashed border-subduedSeparator p-4 rounded-lg overflow-hidden contain-layout'
      style={{
        ...sizeStyle(inlineSize, 'horizontal'),
        ...sizeStyle(blockSize, 'vertical'),
      }}
      {...resizeAttributes}
    >
      {children}
      <ResizeHandle
        side='inline-end'
        fallbackSize={DEFAULT_INLINE_SIZE}
        minSize={MIN_INLINE_SIZE}
        size={inlineSize}
        onSizeChange={setInlineSize}
      />
      <ResizeHandle
        side='block-end'
        fallbackSize={DEFAULT_BLOCK_SIZE}
        minSize={MIN_BLOCK_SIZE}
        size={blockSize}
        onSizeChange={setBlockSize}
      />
    </div>
  );
};
