//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentProps,
  type HTMLAttributes,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { DropIndicator } from './DropIndicator';
import { useListContext } from './ListRoot';

export type ListItemRecord = { id: string };

export type ItemState =
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-over';
      closestEdge: Edge | null;
    };

export const idle: ItemState = { type: 'idle' };

const stateStyles: { [Key in ItemState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-50',
};

type ListItemContext<T extends ListItemRecord> = {
  item: T;
  dragHandleRef: MutableRefObject<HTMLElement | null>;
};

/**
 * Default context defined for ListItemDragPreview, which is defined outside of ListItem.
 */
const defaultContext: ListItemContext<any> = {} as any;

const LIST_ITEM_NAME = 'ListItem';

export const [ListItemProvider, useListItemContext] = createContext<ListItemContext<any>>(
  LIST_ITEM_NAME,
  defaultContext,
);

export type ListItemProps<T extends ListItemRecord> = ThemedClassName<
  PropsWithChildren<{
    item: T;
  }>
>;

/**
 * Draggable list item.
 */
export const ListItem = <T extends ListItemRecord>({ children, classNames, item }: ListItemProps<T>) => {
  const { isItem, dragPreview, setState: setRootState } = useListContext(LIST_ITEM_NAME);
  const ref = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<ItemState>(idle);
  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      //
      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about#draggable
      //
      draggable({
        element,
        dragHandle: dragHandleRef.current!,
        getInitialData: () => item,
        onGenerateDragPreview: dragPreview
          ? ({ nativeSetDragImage, source }) => {
              const rect = source.element.getBoundingClientRect();
              setCustomNativeDragPreview({
                nativeSetDragImage,
                getOffset: ({ container }) => {
                  const { height } = container.getBoundingClientRect();
                  return {
                    x: 20,
                    y: height / 2,
                  };
                },
                render: ({ container }) => {
                  container.style.width = rect.width + 'px';
                  setState({ type: 'preview', container });
                  setRootState({ type: 'preview', container, item });
                },
              });
            }
          : undefined,
        onDragStart: () => {
          setState({ type: 'is-dragging' });
          setRootState({ type: 'is-dragging', item });
        },
        onDrop: () => {
          setState(idle);
          setRootState(idle);
        },
      }),

      //
      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about#drop-target-for-elements
      //
      dropTargetForElements({
        element,
        canDrop: ({ source }) => {
          return source.element !== element && isItem(source.data);
        },
        getData: ({ input }) => {
          return attachClosestEdge(item, { element, input, allowedEdges: ['top', 'bottom'] });
        },
        getIsSticky: () => true,
        onDragEnter: ({ self }) => {
          const closestEdge = extractClosestEdge(self.data);
          setState({ type: 'is-dragging-over', closestEdge });
        },
        onDrag: ({ self }) => {
          const closestEdge = extractClosestEdge(self.data);
          setState((current) => {
            if (current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current;
            }
            return { type: 'is-dragging-over', closestEdge };
          });
        },
        onDragLeave: () => {
          setState(idle);
        },
        onDrop: () => {
          setState(idle);
        },
      }),
    );
  }, [item]);

  return (
    <ListItemProvider item={item} dragHandleRef={dragHandleRef}>
      <div className='relative'>
        <div ref={ref} role='listitem' className={mx('flex overflow-hidden', classNames, stateStyles[state.type])}>
          {children}
        </div>
        {state.type === 'is-dragging-over' && state.closestEdge && <DropIndicator edge={state.closestEdge} />}
      </div>
    </ListItemProvider>
  );
};

//
// List item components
//

export type IconButtonProps = ThemedClassName<ComponentProps<'button'>> & { icon: string };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ classNames, icon, ...props }, forwardedRef) => {
    return (
      <button ref={forwardedRef} className={mx('flex items-center justify-center', classNames)} {...props}>
        <Icon icon={icon} classNames='cursor-pointer' size={4} />
      </button>
    );
  },
);

export const ListItemDeleteButton = ({
  autoHide = true,
  classNames,
  ...props
}: Omit<IconButtonProps, 'icon'> & { autoHide?: boolean }) => {
  const { state } = useListContext('DELETE_BUTTON');
  const disabled = state.type !== 'idle';
  return (
    <IconButton
      icon='ph--x--regular'
      disabled={disabled}
      classNames={[classNames, autoHide && disabled && 'hidden']}
      {...props}
    />
  );
};

export const ListItemDragHandle = () => {
  const { dragHandleRef } = useListItemContext('DRAG_HANDLE');
  return <IconButton ref={dragHandleRef as any} icon='ph--dots-six--regular' />;
};

export const ListItemDragPreview = <T extends ListItemRecord>({
  children,
}: {
  children: ({ item }: { item: T }) => ReactNode;
}) => {
  const { state } = useListContext('DRAG_PREVIEW');
  return state?.type === 'preview' ? createPortal(children({ item: state.item }), state.container) : null;
};

export const ListItemWrapper = ({ classNames, children }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx('flex w-full', classNames)}>{children}</div>
);

export const ListItemTitle = ({
  classNames,
  children,
  ...props
}: ThemedClassName<PropsWithChildren<ComponentProps<'div'>>>) => (
  <div className={mx('grow items-center truncate', classNames)} {...props}>
    {children}
  </div>
);
