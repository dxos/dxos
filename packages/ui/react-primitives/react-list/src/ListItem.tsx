//
// Copyright 2023 DXOS.org
//

import { type CollapsibleContentProps, type CollapsibleTriggerProps } from '@radix-ui/react-collapsible';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentProps, type ForwardRefExoticComponent, forwardRef } from 'react';

import { useId } from '@dxos/react-hooks';

import { LIST_NAME, type ListScopedProps, useListContext } from './ListContext.ts';
import {
  LIST_ITEM_NAME,
  type ListItemElement,
  type ListItemHeadingProps,
  type ListItemProps,
  ListItemProvider,
  type ListItemScopedProps,
  useListItemContext,
} from './ListItemContext.ts';

const ListItemHeading = forwardRef<HTMLDivElement, ListItemHeadingProps>(
  ({ children, asChild, __listItemScope, ...props }, forwardedRef) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME, __listItemScope);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp {...props} id={headingId} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

type ListItemOpenTriggerProps = ListItemScopedProps<CollapsibleTriggerProps>;

const ListItemOpenTrigger = Collapsible.Trigger;

type ListItemCollapsibleContentProps = ComponentProps<typeof Collapsible.Content>;

const ListItemCollapsibleContent: ForwardRefExoticComponent<CollapsibleContentProps> = Collapsible.Content;

const ListItem = forwardRef<ListItemElement, ListItemProps>(
  (props: ListItemScopedProps<ListScopedProps<ListItemProps>>, forwardedRef) => {
    const id = useId('listItem', props.id);

    const {
      __listScope,
      __listItemScope,
      children,
      selected: propsSelected,
      defaultSelected,
      onSelectedChange,
      open: propsOpen,
      defaultOpen,
      onOpenChange,
      collapsible,
      labelId,
      ...listItemProps
    } = props;
    const { selectable } = useListContext(LIST_NAME, __listScope);

    const [selected = false, setSelected] = useControllableState({
      prop: propsSelected,
      defaultProp: defaultSelected,
      onChange: onSelectedChange,
    });

    const [open = false, setOpen] = useControllableState({
      prop: propsOpen,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    const headingId = useId('listItem__heading', labelId);

    const listItem = (
      <Primitive.li
        {...listItemProps}
        id={id}
        ref={forwardedRef}
        aria-labelledby={headingId}
        {...(selectable && { 'role': 'option', 'aria-selected': !!selected })}
        {...(open && { 'aria-expanded': true })}
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
  },
);

ListItem.displayName = LIST_ITEM_NAME;

export { ListItem, ListItemCollapsibleContent, ListItemHeading, ListItemOpenTrigger };

export type { ListItemCollapsibleContentProps, ListItemOpenTriggerProps };
