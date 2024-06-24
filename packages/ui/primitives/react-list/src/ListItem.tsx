//
// Copyright 2023 DXOS.org
//

import type { CheckboxProps } from '@radix-ui/react-checkbox';
import { type CollapsibleContentProps, type CollapsibleTriggerProps } from '@radix-ui/react-collapsible';
import * as Collapsible from '@radix-ui/react-collapsible';
import { createContextScope, type Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentProps,
  type ComponentPropsWithRef,
  type Dispatch,
  type ElementRef,
  forwardRef,
  type ForwardRefExoticComponent,
  type SetStateAction,
} from 'react';

import { useId } from '@dxos/react-hooks';

import { LIST_NAME, type ListScopedProps, useListContext } from './List';

const LIST_ITEM_NAME = 'ListItem';

type ListItemScopedProps<P> = P & { __listItemScope?: Scope };

interface ListItemData {
  id: string;
  labelId?: string;
  selected?: CheckboxProps['checked'];
  open?: boolean;
}

type ListItemProps = Omit<ListItemData, 'id'> & { collapsible?: boolean } & ComponentPropsWithRef<
    typeof Primitive.li
  > & {
    defaultOpen?: boolean;
    onOpenChange?: (nextOpen: boolean) => void;
  } & {
    onSelectedChange?: CheckboxProps['onCheckedChange'];
    defaultSelected?: CheckboxProps['defaultChecked'];
  };

type ListItemElement = ElementRef<typeof Primitive.li>;

const [createListItemContext, createListItemScope] = createContextScope(LIST_ITEM_NAME, []);

type ListItemContextValue = {
  headingId: string;
  open: boolean;
  selected: CheckboxProps['checked'];
  setSelected: Dispatch<SetStateAction<CheckboxProps['checked']>>;
};

const [ListItemProvider, useListItemContext] = createListItemContext<ListItemContextValue>(LIST_ITEM_NAME);

type ListItemHeadingProps = ListItemScopedProps<Omit<ComponentPropsWithRef<typeof Primitive.p>, 'id'>> & {
  asChild?: boolean;
};

const ListItemHeading = forwardRef<HTMLDivElement, ListItemHeadingProps>(
  ({ children, asChild, __listItemScope, ...props }, forwardedRef) => {
    const { headingId } = useListItemContext(LIST_ITEM_NAME, __listItemScope);
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root {...props} id={headingId} ref={forwardedRef}>
        {children}
      </Root>
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
        {...(selectable && { role: 'option', 'aria-selected': !!selected })}
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

export {
  ListItem,
  ListItemHeading,
  ListItemCollapsibleContent,
  ListItemOpenTrigger,
  createListItemScope,
  useListItemContext,
  LIST_ITEM_NAME,
};

export type {
  ListItemProps,
  ListItemHeadingProps,
  ListItemCollapsibleContentProps,
  ListItemOpenTriggerProps,
  ListItemScopedProps,
};
