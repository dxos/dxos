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

// Root font size in px, read lazily and guarded for non-DOM environments (e.g. node tests) so that
// merely importing this module doesn't touch the DOM at load time.
let remCache: number | undefined;
const getRem = (): number => {
  if (remCache === undefined) {
    remCache =
      typeof document !== 'undefined' && typeof getComputedStyle !== 'undefined'
        ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        : 16;
  }
  return remCache;
};

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
        ((location.current.input[client] - location.initial.input[client]) / getRem()) *
          (side.endsWith('start') ? -1 : 1),
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
  size: sizeProp,
  minSize,
  maxSize,
  onSizeChange,
}: ResizeHandleProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [size = 'min-content', setSize] = useControllableState({
    prop: sizeProp,
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
            ? measureSubject(buttonRef.current!, fallbackSize)[orientation === 'horizontal' ? 'width' : 'height'] /
              getRem()
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
        'group absolute flex focus-visible:outline-hidden',
        surfaceZIndex({ elevation, level: 'tooltip' }),
        // Both the grab button (w-4/h-4) and its hover line are centered on the underlying edge: the
        // button is offset by half its size (-2) so it straddles the edge, and the line is centered
        // within the button (start-1/2 / top-1/2) so it sits on the edge too.
        orientation === 'horizontal'
          ? 'cursor-col-resize w-4 inset-y-0 data-[side=inline-end]:-end-2 data-[side=inline-start]:-start-2 border-b-0! before:inset-y-0 before:w-1 before:start-1/2 before:-translate-x-1/2'
          : 'cursor-row-resize h-4 inset-x-0 data-[side=block-end]:-bottom-2 data-[side=block-start]:-top-2 border-x-0! before:inset-x-0 before:h-1 before:top-1/2 before:-translate-y-1/2',
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
        'before:absolute before:block before:bg-focus-ring-subtle',
        classNames,
      )}
    />
  );
};
