//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useLayoutEffect, useRef } from 'react';

import { mx } from '@dxos/react-ui-theme';

const REM = parseFloat(getComputedStyle(document.documentElement).fontSize);

const measureSubject = (element: HTMLButtonElement, fallbackSize: number): { width: number; height: number } => {
  const stackItemElement = element.closest('[data-dx-resize-subject]');
  return stackItemElement?.getBoundingClientRect() ?? { width: fallbackSize, height: fallbackSize };
};

const getNextSize = (
  startSize: number,
  location: DragLocationHistory,
  client: 'clientX' | 'clientY',
  minSize: number,
) => {
  return Math.max(minSize, startSize + (location.current.input[client] - location.initial.input[client]) / REM);
};

export type Size = number | 'min-content';

export type ResizeHandleProps = {
  side: 'inline-start' | 'inline-end' | 'block-start' | 'block-end';
  size?: Size;
  defaultSize?: Size;
  onSizeChange?: (nextSize: Size, commit?: boolean) => void;
  unit?: 'rem';
  fallbackSize: number;
  minSize: number;
  maxSize?: number;
  signifierPosition?: 'start' | 'center' | 'end';
};

export const ResizeHandle = ({
  side,
  defaultSize,
  size: propsSize,
  onSizeChange,
  fallbackSize,
  minSize,
}: ResizeHandleProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [size = 'min-content', setSize] = useControllableState({
    prop: propsSize,
    defaultProp: defaultSize,
    onChange: onSizeChange,
  });
  const dragStartSize = useRef<Size>(size);
  const orientation = side.startsWith('inline') ? 'horizontal' : 'vertical';
  const client = orientation === 'horizontal' ? 'clientX' : 'clientY';

  useLayoutEffect(
    () => {
      if (!buttonRef.current || buttonRef.current.hasAttribute('draggable')) {
        return;
      }
      // TODO(thure): This should handle StackItem state vs local state better.
      draggable({
        element: buttonRef.current,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          // We will be moving the line to indicate a drag; we can disable the native drag preview.
          disableNativeDragPreview({ nativeSetDragImage });
          // We don't want any native drop animation for when the user does not drop on a drop target.
          // We want the drag to finish immediately.
          preventUnhandled.start();
        },
        onDragStart: () => {
          dragStartSize.current =
            dragStartSize.current === 'min-content'
              ? measureSubject(buttonRef.current!, fallbackSize)[orientation === 'horizontal' ? 'width' : 'height'] /
                REM
              : dragStartSize.current;
        },
        onDrag: ({ location }) => {
          if (typeof dragStartSize.current !== 'number') {
            return;
          }
          setSize(getNextSize(dragStartSize.current, location, client, minSize));
        },
        onDrop: ({ location }) => {
          if (typeof dragStartSize.current !== 'number') {
            return;
          }
          const nextSize = getNextSize(dragStartSize.current, location, client, minSize);
          setSize(nextSize);
          onSizeChange?.(nextSize, true);
          dragStartSize.current = nextSize;
        },
      });
    },
    [
      // Note that `size` should not be a dependency here since dragging this adjusts the size.
    ],
  );

  return (
    <button
      ref={buttonRef}
      className={mx(
        'group absolute',
        orientation === 'horizontal'
          ? 'cursor-col-resize is-3 bs-full inline-end-[-1px] !border-lb-0 before:inset-block-0 before:inline-end-0 before:is-1'
          : 'cursor-row-resize bs-3 is-full block-end-[-1px] !border-li-0 before:inset-inline-0 before:block-end-0 before:bs-1',
        'before:transition-opacity before:duration-100 before:ease-in-out before:opacity-0 hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100',
        'before:absolute before:block before:bg-accentFocusIndicator',
      )}
    >
      <div
        role='none'
        className={mx(
          'absolute flex items-center group-hover:opacity-0 group-focus-visible:opacity-0 group-active:opacity-0',
          orientation === 'horizontal'
            ? 'block-start-0 inline-end-px bs-[--rail-size]'
            : 'inline-start-0 block-end-px is-[--rail-size] flex justify-center',
        )}
      >
        <DragHandleSignifier orientation={orientation} />
      </div>
    </button>
  );
};

const DragHandleSignifier = ({ orientation }: { orientation: 'horizontal' | 'vertical' }) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 256 256'
      fill='currentColor'
      className={mx('shrink-0 bs-[1em] is-[1em] text-unAccent', orientation === 'vertical' && 'rotate-90')}
    >
      {/* two pips: <path d='M256,120c-8.8,0-16-7.2-16-16v-56c0-8.8,7.2-16,16-16v88Z' />
      <path d='M256,232c-8.8,0-16-7.2-16-16v-56c0-8.8,7.2-16,16-16v88Z' /> */}
      <path d='M256,64c-8.8,0-16-7.2-16-16s7.2-16,16-16v32Z' />
      <path d='M256,120c-8.8,0-16-7.2-16-16s7.2-16,16-16v32Z' />
      <path d='M256,176c-8.8,0-16-7.2-16-16s7.2-16,16-16v32Z' />
      <path d='M256,232c-8.8,0-16-7.2-16-16s7.2-16,16-16v32Z' />
    </svg>
  );
};
