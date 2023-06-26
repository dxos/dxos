//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import React, { ComponentPropsWithRef, forwardRef, useCallback, useState } from 'react';

// TODO(thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';

type ListScopedProps<P> = P & { __listScope?: Scope };

type ListVariant = 'ordered' | 'unordered' | 'ordered-draggable';

type ListItemSizes = 'one' | 'many';

type SharedListProps = {
  selectable?: boolean;
  variant?: ListVariant;
  listItemIds?: string[];
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  itemSizes?: ListItemSizes;
};

type SharedDraggableListProps = SharedListProps & {
  listItemIds: Exclude<SharedListProps['listItemIds'], undefined>;
  variant: 'ordered-draggable';
};

type HeterogeneousDraggableListProps = Exclude<SharedDraggableListProps, 'itemSizes'> & {
  itemSizes?: 'many';
};

type HomogeneousDraggableListProps = Exclude<SharedDraggableListProps, 'itemSizes'> & {
  itemSizes: 'one';
};

type BaseListProps = Omit<ComponentPropsWithRef<typeof Primitive.ol>, 'onDragEnd' | 'onDragOver'>;

type ListProps =
  | (BaseListProps & SharedListProps)
  | (BaseListProps & HomogeneousDraggableListProps)
  | (BaseListProps & HeterogeneousDraggableListProps);

// LIST

const [createListContext, createListScope] = createContextScope(LIST_NAME, []);

type ListContextValue = Pick<ListProps, 'selectable' | 'variant'> & {
  draggingId?: string;
  itemSizes?: ListItemSizes;
};

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const isOrderedDraggable = (props: ListProps): props is SharedDraggableListProps =>
  props.variant === 'ordered-draggable';
const _isOrderedDraggableHomogeneous = (props: ListProps): props is HomogeneousDraggableListProps =>
  isOrderedDraggable(props) && props.itemSizes === 'one';
const _isOrderedDraggableHeterogeneous = (props: ListProps): props is HeterogeneousDraggableListProps =>
  isOrderedDraggable(props) && props.itemSizes !== 'one';

const List = forwardRef<HTMLOListElement, ListProps>((props: ListScopedProps<ListProps>, forwardedRef) => {
  const {
    __listScope,
    variant = 'ordered',
    selectable = false,
    onDragEnd,
    onDragOver,
    listItemIds,
    itemSizes,
    children,
    ...rootProps
  } = props;
  const ListRoot = variant === 'ordered' || variant === 'ordered-draggable' ? Primitive.ol : Primitive.ul;
  const [draggingId, setDraggingId] = useState<string | undefined>(undefined);
  const onDragStart = useCallback((event: DragStartEvent) => setDraggingId(event.active.id as string), []);
  const composedOnDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(undefined);
      onDragEnd?.(event);
    },
    [onDragEnd],
  );
  return (
    <ListRoot {...(selectable && { role: 'listbox', 'aria-multiselectable': true })} {...rootProps} ref={forwardedRef}>
      <ListProvider
        {...{
          scope: __listScope,
          variant,
          selectable,
          draggingId,
          itemSizes,
        }}
      >
        {isOrderedDraggable(props) ? (
          <DndContext
            onDragEnd={composedOnDragEnd}
            onDragOver={onDragOver}
            onDragStart={onDragStart}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={listItemIds!} strategy={verticalListSortingStrategy}>
              {children}
            </SortableContext>
          </DndContext>
        ) : (
          <>{children}</>
        )}
      </ListProvider>
    </ListRoot>
  );
});

List.displayName = LIST_NAME;

export { List, createListScope, useListContext, LIST_NAME, arrayMove };

export type { ListProps, ListVariant, ListScopedProps, DragEndEvent, DragOverEvent };
