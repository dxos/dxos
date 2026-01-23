//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren } from 'react';

import { Icon, Popover } from '@dxos/react-ui';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';

import { Card } from '../components';

// Sizes in rem

const DEFAULT_INLINE_SIZE = 24;
const MIN_INLINE_SIZE = 8;
const DEFAULT_BLOCK_SIZE = 24;
const MIN_BLOCK_SIZE = 8;

//
// Card container.
//

export const CardContainer = ({
  children,
  icon = 'ph--placeholder--regular',
  role,
}: PropsWithChildren<{ icon?: string; role?: string }>) => {
  switch (role) {
    case 'card--popover':
      return <PopoverCardContainer icon={icon}>{children}</PopoverCardContainer>;

    case 'card--extrinsic':
      return (
        <ExtrinsicCardContainer>
          <Card.Root>{children}</Card.Root>
        </ExtrinsicCardContainer>
      );

    case 'card--intrinsic':
      return (
        <IntrinsicCardContainer>
          <Card.Root>{children}</Card.Root>
        </IntrinsicCardContainer>
      );

    default:
      return <Card.Root>{children}</Card.Root>;
  }
};

//
// Popover
//

export type PopoverCardContainerProps = PropsWithChildren<{ icon?: string }>;

export const PopoverCardContainer = ({ children, icon = 'ph--placeholder--regular' }: PopoverCardContainerProps) => {
  return (
    <Popover.Root open>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>{children}</Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
      <Popover.Trigger>
        <Icon icon={icon} size={5} />
      </Popover.Trigger>
    </Popover.Root>
  );
};

//
// Intrinsic card container (size constrained by card).
//

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
  const [size = DEFAULT_BLOCK_SIZE, setSize] = useControllableState<Size>({
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
      {children}
      <ResizeHandle
        side='inline-end'
        fallbackSize={DEFAULT_BLOCK_SIZE}
        minSize={MIN_BLOCK_SIZE}
        size={size}
        onSizeChange={setSize}
      />
    </div>
  );
};

//
// Extrinsic card container (size constrained by container).
//

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
