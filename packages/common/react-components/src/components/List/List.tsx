//
// Copyright 2023 DXOS.org
//

import { createCollection } from '@radix-ui/react-collection';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { DotsSixVertical } from 'phosphor-react';
import React, { FC, forwardRef, ReactNode } from 'react';

import { useForwardedRef } from '../../hooks';
import { defaultListItemHeading, defaultListItemEndcap } from './listStyles';

const LIST_NAME = 'List';

type ListVariant = 'ordered' | 'unordered' | 'ordered-draggable';

interface ListProps {
  children?: ReactNode;
  selectable?: boolean;
  variant?: ListVariant;
}

interface ListItemData {
  before?: ReactNode;
  after?: ReactNode;
}

interface ListItemProps extends ListItemData {
  children?: ReactNode;
}

type ListItemElement = React.ElementRef<typeof Primitive.li>;
type ScopedProps<P> = P & { __scopeSelect?: Scope };

const [Collection, _useCollection, createCollectionScope] = createCollection<ListItemElement, ListItemData>(LIST_NAME);

const [createListContext, _createListScope] = createContextScope(LIST_NAME, [createCollectionScope]);

type ListContextValue = Pick<ListProps, 'selectable' | 'variant'>;

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const List: FC<ListProps> = (props: ScopedProps<ListProps>) => {
  const { __scopeSelect, children, variant = 'ordered', selectable = false } = props;
  const Root = variant === 'ordered' || variant === 'ordered-draggable' ? 'ol' : 'ul';
  return (
    <Root {...(selectable && { role: 'listbox' })}>
      <ListProvider
        {...{
          scope: __scopeSelect,
          variant,
          selectable
        }}
      >
        <Collection.Provider scope={__scopeSelect}>{children}</Collection.Provider>
      </ListProvider>
    </Root>
  );
};
const ListItem = forwardRef<ListItemElement, ListItemProps>((props: ScopedProps<ListItemProps>, forwardedRef) => {
  const { __scopeSelect, before, after, children } = props;
  const ref = useForwardedRef(forwardedRef);
  const { variant, selectable } = useListContext(LIST_NAME, __scopeSelect);
  return (
    <Primitive.li
      ref={ref}
      {...{
        ...(selectable && { role: 'option' }),
        className: 'flex'
      }}
    >
      {variant === 'ordered-draggable' && (
        <div role='none' className={defaultListItemEndcap}>
          <DotsSixVertical />
        </div>
      )}
      <div role='none' className={defaultListItemEndcap}>
        {before}
      </div>
      <div role='none' className={defaultListItemHeading}>
        {children}
      </div>
      <div role='none' className={defaultListItemEndcap}>
        {after}
      </div>
    </Primitive.li>
  );
});

List.displayName = LIST_NAME;

export { List, ListItem };

export type { ListProps, ListVariant, ListItemProps };
