//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren } from 'react';

import { Icon, Popover } from '@dxos/react-ui';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';

const DEFAULT_BLOCK_SIZE = 22;
const MIN_BLOCK_SIZE = 8;

//
// Card container.
//

export type CardContainerProps = PropsWithChildren<{ role?: 'popover' | 'intrinsic'; icon?: string }>;

export const CardContainer = ({ children, role, icon = 'ph--arrow-line-down--regular' }: CardContainerProps) => {
  switch (role) {
    case 'popover':
      return (
        <div role='none' className='flex justify-center'>
          <PopoverCardContainer icon={icon}>{children}</PopoverCardContainer>
        </div>
      );
    case 'intrinsic':
    default:
      return <IntrinsicCardContainer>{children}</IntrinsicCardContainer>;
  }
};

//
// Popover
//

export type PopoverCardContainerProps = PropsWithChildren<{ icon?: string }>;

export const PopoverCardContainer = ({
  children,
  icon = 'ph--arrow-line-down--regular',
}: PopoverCardContainerProps) => {
  return (
    <Popover.Root open>
      <Popover.Content onOpenAutoFocus={(event: Event) => event.preventDefault()}>
        <Popover.Viewport classNames='popover-card'>{children}</Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
      <Popover.Trigger asChild>
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
      className='relative p-4 border border-dashed border-subdued-separator rounded-lg overflow-x-auto'
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
