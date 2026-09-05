//
// Copyright 2023 DXOS.org
//

import { Collapsible } from '@ark-ui/react/collapsible';
import { ark } from '@ark-ui/react/factory';
import React, { type ComponentProps, forwardRef } from 'react';

import { useControllableState, useId } from '@dxos/react-hooks';

import { LIST_NAME, useListContext } from './ListContext';
import {
  LIST_ITEM_NAME,
  type ListItemElement,
  type ListItemHeadingProps,
  type ListItemProps,
  ListItemProvider,
  useListItemContext,
} from './ListItemContext';

const ListItemHeading = forwardRef<HTMLDivElement, ListItemHeadingProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME);
    return (
      <ark.div asChild={asChild} {...props} id={headingId} ref={forwardedRef}>
        {children}
      </ark.div>
    );
  },
);

type ListItemOpenTriggerProps = ComponentProps<typeof Collapsible.Trigger>;

const ListItemOpenTrigger = Collapsible.Trigger;

type ListItemCollapsibleContentProps = ComponentProps<typeof Collapsible.Content>;

const ListItemCollapsibleContent = Collapsible.Content;

const ListItem = forwardRef<ListItemElement, ListItemProps>((props: ListItemProps, forwardedRef) => {
  const id = useId('listItem', props.id);

  const {
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
  const { selectable } = useListContext(LIST_NAME);

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
    <ark.li
      {...listItemProps}
      id={id}
      ref={forwardedRef}
      aria-labelledby={headingId}
      {...(selectable && { 'role': 'option', 'aria-selected': !!selected })}
      {...(open && { 'aria-expanded': true })}
    >
      {children}
    </ark.li>
  );

  return (
    <ListItemProvider headingId={headingId} open={open} selected={selected} setSelected={setSelected}>
      {collapsible ? (
        <Collapsible.Root asChild open={open} onOpenChange={({ open }) => setOpen(open)}>
          {listItem}
        </Collapsible.Root>
      ) : (
        listItem
      )}
    </ListItemProvider>
  );
});

ListItem.displayName = LIST_ITEM_NAME;

export { ListItem, ListItemCollapsibleContent, ListItemHeading, ListItemOpenTrigger };

export type { ListItemCollapsibleContentProps, ListItemOpenTriggerProps };
