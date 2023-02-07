//
// Copyright 2023 DXOS.org
//

import { CheckedState } from '@radix-ui/react-checkbox';
import { createCollection } from '@radix-ui/react-collection';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { DotsSixVertical } from 'phosphor-react';
import React, { FC, forwardRef, ReactNode, useCallback, useState } from 'react';

import { useForwardedRef, useId } from '../../hooks';
import { getSize } from '../../styles';
import { mx } from '../../util';
import { Checkbox, CheckboxProps } from '../Checkbox';
import { defaultListItemHeading, defaultListItemEndcap } from './listStyles';

// TODO (thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';

type ListVariant = 'ordered' | 'unordered' | 'ordered-draggable';

interface ListProps {
  labelId: string;
  children?: ReactNode;
  selectable?: boolean;
  variant?: ListVariant;
}

interface ListItemData {
  selected?: CheckboxProps['checked'];
  defaultSelected?: CheckboxProps['defaultChecked'];
}

interface ListItemProps extends ListItemData {
  children?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  onSelectedChange?: CheckboxProps['onCheckedChange'];
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
    <Root {...(selectable && { role: 'listbox', 'aria-multiselectable': true })}>
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
  const { __scopeSelect, before, after, children, selected: propsSelected, defaultSelected, onSelectedChange } = props;
  const ref = useForwardedRef(forwardedRef);
  const { variant, selectable } = useListContext(LIST_NAME, __scopeSelect);

  const [internalSelected, setInternalSelected] = useState(defaultSelected);
  const selected = typeof propsSelected === 'undefined' ? internalSelected : propsSelected;
  const onCheckedChange = useCallback(
    (checked: CheckedState) => {
      if (typeof propsSelected === 'undefined') {
        setInternalSelected(checked);
      } else {
        onSelectedChange?.(checked);
      }
    },
    [onSelectedChange]
  );

  const headingId = useId('listItem');

  return (
    <Primitive.li
      ref={ref}
      aria-labelledby={headingId}
      {...{
        ...(selectable && { role: 'option', 'aria-selected': !!selected }),
        className: 'flex'
      }}
    >
      {variant === 'ordered-draggable' && (
        <div role='none' className='bs-10 is-5'>
          <DotsSixVertical className={mx(getSize(5), 'mbs-2.5')} />
        </div>
      )}
      <div role='none' className={defaultListItemEndcap}>
        {selectable ? (
          <Checkbox labelId={headingId} className='mbs-2.5' {...{ checked: selected, onCheckedChange }} />
        ) : (
          before
        )}
      </div>
      {selectable && before && (
        <div role='none' className={defaultListItemEndcap}>
          {before}
        </div>
      )}
      <div role='none' className={defaultListItemHeading} id={headingId}>
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
