//
// Copyright 2023 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext } from '@dnd-kit/sortable';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import omit from 'lodash.omit';
import React, { ComponentPropsWithoutRef, forwardRef, ReactHTMLElement, ReactNode } from 'react';

// TODO(thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';

type ListScopedProps<P> = P & { __listScope?: Scope };

type ListVariant = 'ordered' | 'unordered' | 'ordered-draggable';

interface SharedListProps {
  labelId: string;
  children?: ReactNode;
  selectable?: boolean;
  collapsible?: boolean;
  variant?: ListVariant;
  onDragEnd?: ComponentPropsWithoutRef<typeof DndContext>['onDragEnd'];
  listItemIds?: string[];
  toggleOpenLabel?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
}

interface DraggableListProps extends Omit<SharedListProps, 'onDragEnd' | 'listItemIds' | 'variant' | 'slots'> {
  onDragEnd: Exclude<SharedListProps['onDragEnd'], undefined>;
  listItemIds: Exclude<SharedListProps['listItemIds'], undefined>;
  variant: 'ordered-draggable';
}

type ListProps = SharedListProps | DraggableListProps;

// LIST

const [createListContext, createListScope] = createContextScope(LIST_NAME, []);

type ListContextValue = Pick<ListProps, 'selectable' | 'collapsible' | 'variant' | 'toggleOpenLabel'>;

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const List = forwardRef<HTMLOListElement, ListProps>((props: ListScopedProps<ListProps>, forwardedRef) => {
  const {
    __listScope,
    variant = 'ordered',
    selectable = false,
    collapsible = false,
    toggleOpenLabel = 'Expand/collapse item',
    children,
    ...rootProps
  } = props;
  const ListRoot = variant === 'ordered' || variant === 'ordered-draggable' ? Primitive.ol : Primitive.ul;
  return (
    <ListRoot
      {...(selectable && { role: 'listbox', 'aria-multiselectable': true })}
      aria-labelledby={props.labelId}
      ref={forwardedRef}
      {...omit(rootProps, 'onDragEnd', 'listItemIds')}
    >
      <ListProvider
        {...{
          scope: __listScope,
          variant,
          collapsible,
          selectable,
          toggleOpenLabel
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

export { List, createListScope, useListContext, LIST_NAME };

export type { ListProps, ListVariant, ListScopedProps };
