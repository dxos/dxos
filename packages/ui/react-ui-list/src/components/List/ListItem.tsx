//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentProps,
  type HTMLAttributes,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import {
  IconButton,
  type IconButtonProps,
  ListItem as NaturalListItem,
  type ThemedClassName,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useListContext } from './ListRoot';

export type ListItemRecord = any;

export type ItemDragState =
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

export const idle: ItemDragState = { type: 'idle' };

const stateStyles: { [Key in ItemDragState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
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
  PropsWithChildren<
    {
      item: T;
    } & HTMLAttributes<HTMLDivElement>
  >
>;

/**
 * Draggable list item.
 */
export const ListItem = <T extends ListItemRecord>({ children, classNames, item, ...props }: ListItemProps<T>) => {
  const { isItem, readonly, dragPreview, setState: setRootState } = useListContext(LIST_ITEM_NAME);
  const ref = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<ItemDragState>(idle);

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
        canDrag: () => !readonly,
        getInitialData: () => item as any,
        onGenerateDragPreview: dragPreview
          ? ({ nativeSetDragImage, source }) => {
              const rect = source.element.getBoundingClientRect();
              setCustomNativeDragPreview({
                nativeSetDragImage,
                getOffset: ({ container }) => {
                  const { height } = container.getBoundingClientRect();
                  return { x: 20, y: height / 2 };
                },
                render: ({ container }) => {
                  container.style.width = rect.width + 'px';
                  setState({ type: 'preview', container });
                  setRootState({ type: 'preview', container, item });
                  return () => {}; // TODO(burdon): Cleanup.
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
          return (source.element !== element && isItem?.(source.data)) ?? false;
        },
        getData: ({ input }) => {
          return attachClosestEdge(item as any, { element, input, allowedEdges: ['top', 'bottom'] });
        },
        getIsSticky: () => true,
        onDragEnter: ({ self }) => {
          const closestEdge = extractClosestEdge(self.data);
          setState({ type: 'is-dragging-over', closestEdge });
        },
        onDragLeave: () => {
          setState(idle);
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
        onDrop: () => {
          setState(idle);
        },
      }),
    );
  }, [item]);

  return (
    <ListItemProvider item={item} dragHandleRef={dragHandleRef}>
      <div ref={ref} role='listitem' className={mx('flex relative', classNames, stateStyles[state.type])} {...props}>
        {children}
        {state.type === 'is-dragging-over' && state.closestEdge && (
          <NaturalListItem.DropIndicator edge={state.closestEdge} />
        )}
      </div>
    </ListItemProvider>
  );
};

//
// List item components
//

export const ListItemDeleteButton = ({
  autoHide = true,
  classNames,
  disabled,
  icon = 'ph--x--regular',
  label,
  ...props
}: Partial<Pick<IconButtonProps, 'icon'>> &
  Omit<IconButtonProps, 'icon' | 'label'> & { autoHide?: boolean; label?: string }) => {
  const { state } = useListContext('DELETE_BUTTON');
  const isDisabled = state.type !== 'idle' || disabled;
  const { t } = useTranslation('@dxos/os');
  return (
    <IconButton
      iconOnly
      variant='ghost'
      {...props}
      icon={icon}
      disabled={isDisabled}
      label={label ?? t('delete label')}
      classNames={[classNames, autoHide && disabled && 'hidden']}
    />
  );
};

export const ListItemButton = ({
  autoHide = true,
  iconOnly = true,
  variant = 'ghost',
  classNames,
  disabled,
  ...props
}: IconButtonProps & { autoHide?: boolean }) => {
  const { state } = useListContext('ITEM_BUTTON');
  const isDisabled = state.type !== 'idle' || disabled;
  return (
    <IconButton
      {...props}
      disabled={isDisabled}
      iconOnly={iconOnly}
      variant={variant}
      classNames={[classNames, autoHide && disabled && 'hidden']}
    />
  );
};

export const ListItemDragHandle = ({ disabled }: Pick<IconButtonProps, 'disabled'>) => {
  const { dragHandleRef } = useListItemContext('DRAG_HANDLE');
  const { t } = useTranslation('@dxos/os');
  return (
    <IconButton
      iconOnly
      variant='ghost'
      label={t('drag handle label')}
      ref={dragHandleRef as any}
      icon='ph--dots-six-vertical--regular'
      disabled={disabled}
    />
  );
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
  <div className={mx('flex is-full gap-2', classNames)}>{children}</div>
);

export const ListItemTitle = ({
  classNames,
  children,
  ...props
}: ThemedClassName<PropsWithChildren<ComponentProps<'div'>>>) => (
  <div className={mx('flex grow items-center truncate', classNames)} {...props}>
    {children}
  </div>
);
