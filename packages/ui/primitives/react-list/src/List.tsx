//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import omit from 'lodash.omit';
import React, { ComponentPropsWithRef, forwardRef, ReactHTMLElement } from 'react';

// TODO(thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';

type ListScopedProps<P> = P & { __listScope?: Scope };

type ListVariant = 'ordered' | 'unordered' | 'ordered-draggable';

type SharedListProps = {
  selectable?: boolean;
  variant?: ListVariant;
  onDragEnd?: (event: DragEndEvent) => void;
  listItemIds?: string[];
  toggleOpenLabel?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
};

type DraggableListProps = Omit<SharedListProps, 'slots'> & {
  onDragEnd: Exclude<SharedListProps['onDragEnd'], undefined>;
  listItemIds: Exclude<SharedListProps['listItemIds'], undefined>;
  variant: 'ordered-draggable';
};

type ListProps =
  | (Omit<ComponentPropsWithRef<typeof Primitive.ol>, 'onDragEnd'> & SharedListProps)
  | (Omit<ComponentPropsWithRef<typeof Primitive.ol>, 'onDragEnd'> & DraggableListProps);

// LIST

const [createListContext, createListScope] = createContextScope(LIST_NAME, []);

type ListContextValue = Pick<ListProps, 'selectable' | 'variant' | 'toggleOpenLabel'>;

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const List = forwardRef<HTMLOListElement, ListProps>((props: ListScopedProps<ListProps>, forwardedRef) => {
  const {
    __listScope,
    variant = 'ordered',
    selectable = false,
    toggleOpenLabel = 'Expand/collapse item',
    children,
    ...rootProps
  } = props;
  const ListRoot = variant === 'ordered' || variant === 'ordered-draggable' ? Primitive.ol : Primitive.ul;
  return (
    <ListRoot
      {...(selectable && { role: 'listbox', 'aria-multiselectable': true })}
      {...omit(rootProps, 'onDragEnd', 'listItemIds')}
      ref={forwardedRef}
    >
      <ListProvider
        {...{
          scope: __listScope,
          variant,
          selectable,
          toggleOpenLabel,
        }}
      >
        {variant === 'ordered-draggable' ? (
          <DndContext onDragEnd={(props as DraggableListProps).onDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={(props as DraggableListProps).listItemIds}>{children}</SortableContext>
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

export type { ListProps, ListVariant, ListScopedProps, DragEndEvent };
