//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useLayoutEffect, useRef } from 'react';

import { type ThemedClassName, useElevationContext } from '@dxos/react-ui';
import { mx, surfaceZIndex } from '@dxos/ui-theme';

import { type Side, type Size } from '../types';

const REM = parseFloat(getComputedStyle(document.documentElement).fontSize);

const measureSubject = (element: HTMLButtonElement, fallbackSize: number): { width: number; height: number } => {
  const stackItemElement = element.closest('[data-dx-resize-subject]');
  return stackItemElement?.getBoundingClientRect() ?? { width: fallbackSize, height: fallbackSize };
};

const getNextSize = (
  startSize: number,
  location: DragLocationHistory,
  client: 'clientX' | 'clientY',
  side: Side,
  minSize: number,
  maxSize: number | undefined,
) => {
  return Math.min(
    maxSize ?? Infinity,
    Math.max(
      minSize,
      startSize +
        ((location.current.input[client] - location.initial.input[client]) / REM) * (side.endsWith('end') ? 1 : -1),
    ),
  );
};

const RESIZE_SUBJECT = 'data-dx-resize-subject';
const RESIZE_SUBJECT_DRAGGING = 'data-dx-resizing';

export const resizeAttributes = {
  [RESIZE_SUBJECT]: true,
};

export type ResizeHandleProps = ThemedClassName<{
  side: Side;
  iconPosition?: 'start' | 'center' | 'end';
  defaultSize?: Size;
  fallbackSize: number;
  size?: Size;
  minSize: number;
  maxSize?: number;
  unit?: 'rem';
  onSizeChange?: (nextSize: Size, commit?: boolean) => void;
}>;

export const ResizeHandle = ({
  classNames,
  side,
  iconPosition = 'start',
  defaultSize,
  fallbackSize,
  size: _size,
  minSize,
  maxSize,
  onSizeChange,
}: ResizeHandleProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [size = 'min-content', setSize] = useControllableState({
    prop: _size,
    defaultProp: defaultSize,
    onChange: onSizeChange,
  });
  const dragStartSize = useRef<Size>(size);
  const elevation = useElevationContext();

  const orientation = side.startsWith('inline') ? 'horizontal' : 'vertical';
  const client = orientation === 'horizontal' ? 'clientX' : 'clientY';

  useLayoutEffect(() => {
    if (!buttonRef.current) {
      return;
    }

    // TODO(thure): This should handle StackItem state vs local state better.
    return draggable({
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
            ? measureSubject(buttonRef.current!, fallbackSize)[orientation === 'horizontal' ? 'width' : 'height'] / REM
            : dragStartSize.current;
        buttonRef.current?.closest(`[${RESIZE_SUBJECT}]`)?.setAttribute(RESIZE_SUBJECT_DRAGGING, 'true');
      },
      // NOTE: Throttling here doesn't prevent the warning:
      //  Measure loop restarted more than 5 times
      onDrag: ({ location }) => {
        if (typeof dragStartSize.current !== 'number') {
          return;
        }
        setSize(getNextSize(dragStartSize.current, location, client, side, minSize, maxSize));
      },
      onDrop: ({ location }) => {
        if (typeof dragStartSize.current !== 'number') {
          return;
        }
        const nextSize = getNextSize(dragStartSize.current, location, client, side, minSize, maxSize);
        setSize(nextSize);
        onSizeChange?.(nextSize, true);
        dragStartSize.current = nextSize;
        buttonRef.current?.closest(`[${RESIZE_SUBJECT}]`)?.removeAttribute(RESIZE_SUBJECT_DRAGGING);
      },
    });
  }, [
    // Note that `size` should not be a dependency here since dragging this adjusts the size.
    minSize,
    maxSize,
  ]);

  return (
    <button
      ref={buttonRef}
      data-side={side}
      className={mx(
        'group absolute flex focus-visible:outline-none',
        surfaceZIndex({ elevation, level: 'tooltip' }),
        orientation === 'horizontal'
          ? 'cursor-col-resize is-4 inset-block-0 data-[side="inline-end"]:inline-end-0 data-[side="inline-end"]:before:inline-end-0 data-[side="inline-start"]:inline-start-0 data-[side="inline-start"]:before:inline-start-0 !border-lb-0 before:inset-block-0 before:is-1'
          : 'cursor-row-resize bs-4 inset-inline-0 data-[side="block-end"]:block-end-0 data-[side="block-end"]:before:block-end-0 data-[side="block-start"]:block-start-0 data-[side="block-start"]:before:block-start-0 !border-li-0 before:inset-inline-0 before:bs-1',
        orientation === 'horizontal'
          ? iconPosition === 'end'
            ? 'align-end'
            : iconPosition === 'center'
              ? 'align-center'
              : 'align-start'
          : iconPosition === 'end'
            ? 'justify-end'
            : iconPosition === 'center'
              ? 'justify-center'
              : 'justify-start',
        'before:transition-opacity before:duration-100 before:ease-in-out before:opacity-0 hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100',
        'before:absolute before:block before:bg-neutralFocusIndicator',
        classNames,
      )}
    >
      <div
        role='none'
        data-side={side}
        className={mx(
          'grid place-items-center group-hover:opacity-0 group-focus-visible:opacity-0 group-active:opacity-0',
          orientation === 'horizontal' ? 'bs-[--rail-size] is-4' : 'is-[--rail-size] bs-4',
        )}
      >
        <DragHandleSignifier side={side} />
      </div>
    </button>
  );
};

const DragHandleSignifier = ({ side }: Pick<ResizeHandleProps, 'side'>) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 256 256'
      fill='currentColor'
      className={mx(
        'shrink-0 bs-4 is-4 text-unAccent',
        side === 'block-end'
          ? 'rotate-90'
          : side === 'block-start'
            ? '-rotate-90'
            : side === 'inline-start' && 'rotate-180',
      )}
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
