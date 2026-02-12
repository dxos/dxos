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

export const CardContainer = ({
  children,
  icon = 'ph--arrow-line-down--regular',
  role,
}: PropsWithChildren<{ icon?: string; role?: string }>) => {
  switch (role) {
    case 'card--popover':
      return <PopoverCardContainer icon={icon}>{children}</PopoverCardContainer>;
    case 'card--intrinsic':
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
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport classNames='popover-card-max-height popover-card-max-width'>{children}</Popover.Viewport>
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
      className='relative border border-dashed border-subduedSeparator p-4 rounded-lg overflow-x-auto'
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
