//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { useFocusableGroup } from '@fluentui/react-tabster';
import { composeRefs } from '@radix-ui/react-compose-refs';
import React, {
  forwardRef,
  useLayoutEffect,
  useState,
  createContext,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  useContext,
  useRef,
  useCallback,
} from 'react';

import { type ThemedClassName, Icon, useTranslation, type ButtonProps } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useStack } from './Stack';
import { translationKey } from './translations';

export type StackItemSize = number | 'min-content';
export const DEFAULT_HORIZONTAL_SIZE = 44 satisfies StackItemSize;
export const DEFAULT_VERTICAL_SIZE = 'min-content' satisfies StackItemSize;
export const DEFAULT_EXTRINSIC_SIZE = DEFAULT_HORIZONTAL_SIZE satisfies StackItemSize;
const REM = parseFloat(getComputedStyle(document.documentElement).fontSize);

export type StackItemData = { id: string; type: 'column' | 'card' };

export type StackItemProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  item: Omit<StackItemData, 'type'>;
  order?: number;
  onRearrange?: (source: StackItemData, target: StackItemData, closestEdge: Edge | null) => void;
  size?: StackItemSize;
  onSizeChange?: (nextSize: StackItemSize) => void;
};

type StackItemContextValue = {
  selfDragHandleRef: (element: HTMLDivElement | null) => void;
  size: StackItemSize;
  setSize: (nextSize: StackItemSize, commit?: boolean) => void;
};

const StackItemContext = createContext<StackItemContextValue>({
  selfDragHandleRef: () => {},
  size: 'min-content',
  setSize: () => {},
});

const useStackItem = () => useContext(StackItemContext);

export const StackItem = forwardRef<HTMLDivElement, StackItemProps>(
  (
    { item, children, classNames, onRearrange, size: propsSize, onSizeChange, order, style, ...props },
    forwardedRef,
  ) => {
    const [itemElement, itemRef] = useState<HTMLDivElement | null>(null);
    const [selfDragHandleElement, selfDragHandleRef] = useState<HTMLDivElement | null>(null);
    const [closestEdge, setEdge] = useState<Edge | null>(null);
    const { orientation, rail, separators } = useStack();
    const [size = orientation === 'horizontal' ? DEFAULT_HORIZONTAL_SIZE : DEFAULT_VERTICAL_SIZE, setInternalSize] =
      useState(propsSize);

    const composedItemRef = composeRefs<HTMLDivElement>(itemRef, forwardedRef);

    const setSize = useCallback(
      (nextSize: StackItemSize, commit?: boolean) => {
        setInternalSize(nextSize);
        if (commit) {
          onSizeChange?.(nextSize);
        }
      },
      [onSizeChange],
    );

    const type = orientation === 'horizontal' ? 'column' : 'card';

    useLayoutEffect(() => {
      if (!itemElement || !onRearrange) {
        return;
      }
      return combine(
        draggable({
          element: itemElement,
          ...(selfDragHandleElement && { dragHandle: selfDragHandleElement }),
          getInitialData: () => ({ id: item.id, type }),
        }),
        dropTargetForElements({
          element: itemElement,
          getData: ({ input, element }) => {
            return attachClosestEdge(
              { id: item.id, type },
              { input, element, allowedEdges: orientation === 'horizontal' ? ['left', 'right'] : ['top', 'bottom'] },
            );
          },
          onDragEnter: ({ self, source }) => {
            if (source.data.type === self.data.type) {
              setEdge(extractClosestEdge(self.data));
            }
          },
          onDrag: ({ self, source }) => {
            if (source.data.type === self.data.type) {
              setEdge(extractClosestEdge(self.data));
            }
          },
          onDragLeave: () => setEdge(null),
          onDrop: ({ self, source }) => {
            setEdge(null);
            if (source.data.type === self.data.type) {
              onRearrange(source.data as StackItemData, self.data as StackItemData, extractClosestEdge(self.data));
            }
          },
        }),
      );
    }, [orientation, item, onRearrange, selfDragHandleElement, itemElement]);

    const focusGroupAttrs = useFocusableGroup({ tabBehavior: 'limited' });

    return (
      <StackItemContext.Provider value={{ selfDragHandleRef, size, setSize }}>
        <div
          {...props}
          tabIndex={0}
          {...focusGroupAttrs}
          className={mx(
            'group/stack-item grid relative ch-focus-ring-inset-over-all',
            size === 'min-content' && (orientation === 'horizontal' ? 'is-min' : 'bs-min'),
            orientation === 'horizontal' ? 'grid-rows-subgrid' : 'grid-cols-subgrid',
            rail && (orientation === 'horizontal' ? 'row-span-2' : 'col-span-2'),
            separators && (orientation === 'horizontal' ? 'divide-separator divide-y' : 'divide-separator divide-x'),
            classNames,
          )}
          data-dx-stack-item
          style={{
            ...(size !== 'min-content' && {
              [orientation === 'horizontal' ? 'inlineSize' : 'blockSize']: `${size}rem`,
            }),
            ...(Number.isFinite(order) && {
              [orientation === 'horizontal' ? 'gridColumn' : 'gridRow']: `${order}`,
            }),
            ...style,
          }}
          ref={composedItemRef}
        >
          {children}
          {closestEdge && <DropIndicator edge={closestEdge} />}
        </div>
      </StackItemContext.Provider>
    );
  },
);

export type StackItemHeadingProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

export const StackItemHeading = ({ children, classNames, ...props }: StackItemHeadingProps) => {
  const { orientation } = useStack();
  const { selfDragHandleRef } = useStackItem();
  const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited' });
  return (
    <div
      role='heading'
      {...props}
      tabIndex={0}
      {...focusableGroupAttrs}
      className={mx(
        'grid ch-focus-ring-inset-over-all relative',
        orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]',
        classNames,
      )}
      ref={selfDragHandleRef}
    >
      {children}
    </div>
  );
};

const measureStackItem = (element: HTMLButtonElement): { width: number; height: number } => {
  const stackItemElement = element.closest('[data-dx-stack-item]');
  return stackItemElement?.getBoundingClientRect() ?? { width: DEFAULT_EXTRINSIC_SIZE, height: DEFAULT_EXTRINSIC_SIZE };
};

export const StackItemResizeHandle = (props: ButtonProps) => {
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
    <button
      tabIndex={-1}
      ref={buttonRef}
      className={mx(
        'text-description ch-focus-ring p-px rounded',
        orientation === 'horizontal' ? 'self-center justify-self-end' : 'self-end justify-self-center',
      )}
    >
      <Icon icon={orientation === 'horizontal' ? 'ph--dots-six-vertical--regular' : 'ph--dots-six--regular'} />
      <span className='sr-only'>{t('resize label')}</span>
    </button>
  );
};

export type StackItemContentProps = ThemedClassName<ComponentPropsWithoutRef<'div'>> & {
  toolbar?: boolean;
  statusbar?: boolean;
  contentSize?: 'cover' | 'intrinsic';
};

export const StackItemContent = ({
  children,
  toolbar = true,
  statusbar,
  contentSize = 'cover',
  classNames,
  ...props
}: StackItemContentProps) => {
  const { size, separators } = useStack();

  return (
    <div
      role='none'
      {...props}
      className={mx(
        'group',
        contentSize === 'intrinsic' ? 'flex flex-col' : 'grid',
        size === 'contain' && 'min-bs-0 overflow-hidden',
        separators && 'divide-separator divide-y',
        classNames,
      )}
      style={{
        gridTemplateRows: [
          ...(toolbar ? ['var(--rail-action)'] : []),
          '1fr',
          ...(statusbar ? ['var(--statusbar-size)'] : []),
        ].join(' '),
      }}
    >
      {children}
    </div>
  );
};
