//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import React, { useLayoutEffect, useRef } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { useStack, useStackItem } from './StackContext';
import { DEFAULT_EXTRINSIC_SIZE, type StackItemSize } from './StackItem';

const REM = parseFloat(getComputedStyle(document.documentElement).fontSize);

const measureStackItem = (element: HTMLButtonElement): { width: number; height: number } => {
  const stackItemElement = element.closest('[data-dx-stack-item]');
  return stackItemElement?.getBoundingClientRect() ?? { width: DEFAULT_EXTRINSIC_SIZE, height: DEFAULT_EXTRINSIC_SIZE };
};

export const StackItemResizeHandle = ({ className }: { className?: string }) => {
  const { orientation } = useStack();
  const { setSize, size } = useStackItem();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartSize = useRef<StackItemSize>(size);
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
          // we will be moving the line to indicate a drag
          // we can disable the native drag preview
          disableNativeDragPreview({ nativeSetDragImage });
          // we don't want any native drop animation for when the user
          // does not drop on a drop target. we want the drag to finish immediately
          preventUnhandled.start();
        },
        onDragStart: () => {
          dragStartSize.current =
            dragStartSize.current === 'min-content'
              ? measureStackItem(buttonRef.current!)[orientation === 'horizontal' ? 'width' : 'height'] / REM
              : dragStartSize.current;
        },
        onDrag: ({ location }) => {
          if (typeof dragStartSize.current !== 'number') {
            return;
          }
          setSize(dragStartSize.current + (location.current.input[client] - location.initial.input[client]) / REM);
        },
        onDrop: ({ location }) => {
          if (typeof dragStartSize.current !== 'number') {
            return;
          }
          const nextSize =
            dragStartSize.current + (location.current.input[client] - location.initial.input[client]) / REM;
          setSize(nextSize, true);
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
        orientation === 'horizontal' ? 'cursor-col-resize' : 'cursor-row-resize',
        'group absolute is-3 bs-full inline-end-[-1px]',
        'before:transition-opacity before:duration-100 before:ease-in-out before:opacity-0 hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100',
        'before:absolute before:block before:inset-block-0 before:inline-end-0 before:is-1 before:bg-accentFocusIndicator',
        className,
      )}
    >
      <div
        role='none'
        className='absolute block-start-0 inline-end-[1px] bs-[--rail-size] flex items-center group-hover:opacity-0 group-focus-visible:opacity-0 group-active:opacity-0'
      >
        <DragHandleSignifier />
      </div>
    </button>
  );
};

const DragHandleSignifier = () => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 256 256'
      fill='currentColor'
      className='shrink-0 bs-[1em] is-[1em] text-unAccent'
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
