//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import React, { useLayoutEffect, useRef } from 'react';

import { useTranslation, IconButton } from '@dxos/react-ui';

import { useStack, useStackItem } from './StackContext';
import { DEFAULT_EXTRINSIC_SIZE, type StackItemSize } from './StackItem';
import { translationKey } from '../translations';

const REM = parseFloat(getComputedStyle(document.documentElement).fontSize);

const measureStackItem = (element: HTMLButtonElement): { width: number; height: number } => {
  const stackItemElement = element.closest('[data-dx-stack-item]');
  return stackItemElement?.getBoundingClientRect() ?? { width: DEFAULT_EXTRINSIC_SIZE, height: DEFAULT_EXTRINSIC_SIZE };
};

export const StackItemResizeHandle = () => {
  const { t } = useTranslation(translationKey);
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
    <IconButton
      iconOnly
      variant='ghost'
      ref={buttonRef}
      label={t('resize label')}
      icon={orientation === 'horizontal' ? 'ph--dots-six-vertical--regular' : 'ph--dots-six--regular'}
      classNames={[
        'ch-focus-ring !p-px rounded',
        orientation === 'horizontal' ? 'self-center justify-self-end' : 'self-end justify-self-center',
      ]}
    />
  );
};
