//
// Copyright 2023 DXOS.org
//

import { DraggableAttributes } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckboxProps } from '@radix-ui/react-checkbox';
import { CollapsibleTriggerProps } from '@radix-ui/react-collapsible';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  Dispatch,
  forwardRef,
  SetStateAction
} from 'react';

import { useId } from '@dxos/react-hooks';

import { LIST_NAME, useListContext } from './List';

const LIST_ITEM_NAME = 'ListItem';

type ListItemScopedProps<P> = P & { __listItemScope?: Scope };

interface ListItemData {
  id: string;
  selected?: CheckboxProps['checked'];
  open?: boolean;
}

type ListItemProps = Omit<ListItemData, 'id'> &
  ComponentPropsWithRef<typeof Primitive.li> & {
    defaultOpen?: boolean;
    onOpenChange?: (nextOpen: boolean) => void;
  } & {
    onSelectedChange?: CheckboxProps['onCheckedChange'];
    defaultSelected?: CheckboxProps['defaultChecked'];
  };

type ListItemElement = React.ElementRef<typeof Primitive.li>;

const [createListItemContext, createListItemScope] = createContextScope(LIST_ITEM_NAME, []);

type DraggableListItemContextValue = {
  draggableAttributes: DraggableAttributes;
  draggableListeners: ReturnType<typeof useSortable>['listeners'];
};

type ListItemContextValue = {
  headingId: string;
  open: boolean;
  selected: CheckboxProps['checked'];
  setSelected: Dispatch<SetStateAction<CheckboxProps['checked']>>;
} & Partial<DraggableListItemContextValue>;

const [ListItemProvider, useListItemContext] = createListItemContext<ListItemContextValue>(LIST_ITEM_NAME);

type ListItemHeadingProps = ListItemScopedProps<ComponentPropsWithoutRef<'p'>> & { asChild?: boolean };

const ListItemHeading = ({ children, asChild, __listItemScope, ...props }: ListItemHeadingProps) => {
  const { headingId } = useListItemContext(LIST_ITEM_NAME, __listItemScope);
  const Root = asChild ? Slot : 'div';
  return (
    <Root {...props} id={headingId}>
      {children}
    </Root>
  );
};

type ListItemDragHandleProps = ComponentPropsWithRef<'div'>;

const ListItemDragHandle = forwardRef<HTMLDivElement, ListItemScopedProps<ListItemDragHandleProps>>(
  ({ __listItemScope, children, ...props }, forwardedRef) => {
    const { draggableAttributes, draggableListeners } = useListItemContext(LIST_ITEM_NAME, __listItemScope);
    return (
      <div role='button' ref={forwardedRef} {...props} {...draggableAttributes} {...draggableListeners}>
        {children}
      </div>
    );
  }
);

type ListItemOpenTriggerProps = CollapsibleTriggerProps;

const ListItemOpenTrigger = Collapsible.Trigger;

type ListItemCollapsibleContentProps = ComponentProps<typeof Collapsible.Content>;

const ListItemCollapsibleContent = Collapsible.Content;

const PureListItem = forwardRef<
  ListItemElement,
  ListItemProps & { id: string } & Partial<DraggableListItemContextValue>
>(
  (
    props: ListItemScopedProps<ListItemProps & { id: string } & Partial<DraggableListItemContextValue>>,
    forwardedRef
  ) => {
    const {
      __listItemScope,
      children,
      selected: propsSelected,
      defaultSelected,
      onSelectedChange,
      open: propsOpen,
      defaultOpen,
      onOpenChange,
      id,
      draggableAttributes,
      draggableListeners,
      ...listItemProps
    } = props;
    const { selectable, collapsible } = useListContext(LIST_NAME, __listItemScope);

    const [selected = false, setSelected] = useControllableState({
      prop: propsSelected,
      defaultProp: defaultSelected,
      onChange: onSelectedChange
    });

    const [open = false, setOpen] = useControllableState({
      prop: propsOpen,
      defaultProp: defaultOpen,
      onChange: onOpenChange
    });

    const headingId = useId('listItem__heading');

    const listItem = (
      <Primitive.li
        {...listItemProps}
        id={id}
        ref={forwardedRef}
        aria-labelledby={headingId}
        {...(selectable && { role: 'option', 'aria-selected': !!selected })}
      >
        {children}
      </Primitive.li>
    );

    return (
      <ListItemProvider
        scope={__listItemScope}
        headingId={headingId}
        open={open}
        selected={selected}
        setSelected={setSelected}
        {...{ draggableAttributes, draggableListeners }}
      >
        {collapsible ? (
          <Collapsible.Root asChild open={open} onOpenChange={setOpen}>
            {listItem}
          </Collapsible.Root>
        ) : (
          listItem
        )}
      </ListItemProvider>
    );
  }
);

const DraggableListItem = forwardRef<ListItemElement, ListItemProps & { id: string }>(
  (props: ListItemScopedProps<ListItemProps & { id: string }>, forwardedRef) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: props.id
    });
    const ref = useComposedRefs(forwardedRef, setNodeRef) as ComponentPropsWithRef<typeof Primitive.li>['ref'];

    return (
      <PureListItem
        {...props}
        style={{
          ...props.style,
          transform: CSS.Transform.toString(transform),
          transition
        }}
        ref={ref}
        {...{
          draggableAttributes: attributes,
          draggableListeners: listeners
        }}
      />
    );
  }
);

const ListItem = forwardRef<ListItemElement, ListItemProps>(
  (props: ListItemScopedProps<ListItemProps>, forwardedRef) => {
    const { variant } = useListContext(LIST_NAME, props.__listItemScope);
    const listItemId = useId('listItem');

    if (variant === 'ordered-draggable') {
      return <DraggableListItem {...props} ref={forwardedRef} id={props.id ?? listItemId} />;
    } else {
      return <PureListItem {...props} ref={forwardedRef} id={props.id ?? listItemId} />;
    }
  }
);

ListItem.displayName = LIST_ITEM_NAME;

export {
  ListItem,
  ListItemHeading,
  ListItemCollapsibleContent,
  ListItemDragHandle,
  ListItemOpenTrigger,
  createListItemScope,
  useListItemContext,
  LIST_ITEM_NAME
};

export type {
  ListItemProps,
  ListItemHeadingProps,
  ListItemCollapsibleContentProps,
  ListItemDragHandleProps,
  ListItemOpenTriggerProps,
  ListItemScopedProps
};
