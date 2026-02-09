//
// Copyright 2023 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

// TODO(thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';

type ListScopedProps<P> = P & { __listScope?: Scope };

type ListVariant = 'ordered' | 'unordered';

type ListItemSizes = 'one' | 'many';

type ListProps = ComponentPropsWithRef<typeof Primitive.ol> & {
  selectable?: boolean;
  variant?: ListVariant;
  itemSizes?: ListItemSizes;
};

const [createListContext, createListScope] = createContextScope(LIST_NAME, []);

type ListContextValue = {
  selectable: Exclude<ListProps['selectable'], undefined>;
  variant: Exclude<ListProps['variant'], undefined>;
  itemSizes?: ListItemSizes;
};

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const List = forwardRef<HTMLOListElement, ListProps>((props: ListScopedProps<ListProps>, forwardedRef) => {
  const { __listScope, variant = 'ordered', selectable = false, itemSizes, children, ...rootProps } = props;
  const ListRoot = variant === 'ordered' ? Primitive.ol : Primitive.ul;
  return (
    <ListRoot {...(selectable && { role: 'listbox', 'aria-multiselectable': true })} {...rootProps} ref={forwardedRef}>
      <ListProvider
        {...{
          scope: __listScope,
          variant,
          selectable,
          itemSizes,
        }}
      >
        {children}
      </ListProvider>
    </ListRoot>
  );
});

List.displayName = LIST_NAME;

export { List, createListScope, useListContext, LIST_NAME };

export type { ListProps, ListVariant, ListScopedProps };
