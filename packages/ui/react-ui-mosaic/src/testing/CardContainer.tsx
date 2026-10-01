//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { Next } from '@dxos/react-ui/next';

const DEFAULT_BLOCK_SIZE = 22;
const MIN_BLOCK_SIZE = 8;

//
// Card container.
//

export type CardContainerProps = PropsWithChildren<{
  icon?: string;
  role?: 'popover' | 'intrinsic';
}>;

export const CardContainer = ({ children, role, icon = 'ph--arrow-line-down--regular' }: CardContainerProps) => {
  switch (role) {
    case 'popover':
      return (
        <div className='flex justify-center'>
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

export type PopoverCardContainerProps = PropsWithChildren<{
  icon?: string;
}>;

export const PopoverCardContainer = ({
  children,
  icon = 'ph--arrow-line-down--regular',
}: PopoverCardContainerProps) => {
  return (
    <Next.Popover.Root open autoFocus={false}>
      <Next.Popover.Trigger asChild>
        <Next.Icon icon={icon} />
      </Next.Popover.Trigger>
      <Next.Popover.Content>
        <Next.Popover.Body>
          {/* Mirrors the deck's popover card host (plugin-deck Overlays/Popover.tsx) so card
                stories exercise the real composition: Card.Root grid + header + content. */}
          <Next.Card.Root border={false} classNames='dx-card-popover'>
            <Next.Card.Header>
              <Next.Block>
                <Next.Icon icon={icon} />
              </Next.Block>
              <Next.Card.Title>Popover</Next.Card.Title>
            </Next.Card.Header>
            {children}
          </Next.Card.Root>
        </Next.Popover.Body>
      </Next.Popover.Content>
    </Next.Popover.Root>
  );
};

//
// Intrinsic card container (size constrained by card itself).
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
      className='relative p-2 grid overflow-hidden border-2 border-dashed border-green-500 rounded-lg'
      style={sizeStyle(size, 'horizontal')}
      {...resizeAttributes}
    >
      <div className='dx-expand flex flex-col'>{children}</div>
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
