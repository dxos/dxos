//
// Copyright 2023 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createCollection } from '@radix-ui/react-collection';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContextScope, Scope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { DotsSixVertical } from 'phosphor-react';
import React, {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  FC,
  forwardRef,
  ReactNode,
  useEffect,
  useState
} from 'react';

import { useId } from '../../hooks';
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
  id: string;
  selected?: CheckboxProps['checked'];
}

interface ListItemSlots {
  root?: Omit<ComponentPropsWithRef<'li'>, 'id'>;
  heading?: ComponentPropsWithoutRef<'div'>;
  dragHandle?: ComponentPropsWithoutRef<'div'>;
}

interface ListItemProps extends Omit<ListItemData, 'id'> {
  children?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  onSelectedChange?: CheckboxProps['onCheckedChange'];
  defaultSelected?: CheckboxProps['defaultChecked'];
  slots?: ListItemSlots;
  id?: string;
}

type ListItemElement = React.ElementRef<typeof Primitive.li>;
type ScopedProps<P> = P & { __scopeSelect?: Scope };

const [Collection, useCollection, createCollectionScope] = createCollection<ListItemElement, ListItemData>(LIST_NAME);

const [createListContext, _createListScope] = createContextScope(LIST_NAME, [createCollectionScope]);

type ListContextValue = Pick<ListProps, 'selectable' | 'variant'>;

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const List: FC<ListProps> = (props: ScopedProps<ListProps>) => {
  const { __scopeSelect, variant = 'ordered', selectable = false } = props;
  const Root = variant === 'ordered' || variant === 'ordered-draggable' ? Primitive.ol : Primitive.ul;

  return (
    <Root {...(selectable && { role: 'listbox', 'aria-multiselectable': true })}>
      <ListProvider
        {...{
          scope: __scopeSelect,
          variant,
          selectable
        }}
      >
        <Collection.Provider scope={__scopeSelect}>
          <ListContent {...props} />
        </Collection.Provider>
      </ListProvider>
    </Root>
  );
};

const ListContent: FC<ListProps> = (props: ScopedProps<ListProps>) => {
  const { variant } = useListContext('ListContent', props.__scopeSelect);
  const getItems = useCollection(props.__scopeSelect);
  const [itemIds, setItemIds] = useState<string[]>([]);

  useEffect(() => {
    setItemIds(getItems().map((item) => item?.ref.current?.id ?? ''));
  }, [getItems]);

  return variant === 'ordered-draggable' ? (
    <DndContext modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={itemIds}>{props.children}</SortableContext>
    </DndContext>
  ) : (
    <>{props.children}</>
  );
};

const PureListItem = forwardRef<ListItemElement, ListItemProps>((props: ScopedProps<ListItemProps>, forwardedRef) => {
  const {
    __scopeSelect,
    before,
    after,
    children,
    selected: propsSelected,
    defaultSelected,
    onSelectedChange,
    id,
    slots = {}
  } = props;
  const { variant, selectable } = useListContext(LIST_NAME, __scopeSelect);

  const [selected = false, setSelected] = useControllableState({
    prop: propsSelected,
    defaultProp: defaultSelected,
    onChange: onSelectedChange
  });

  const headingId = useId('listItem__heading');

  return (
    <Collection.ItemSlot id={id!} scope={__scopeSelect} selected={selected}>
      <Primitive.li
        {...slots.root}
        id={id}
        ref={forwardedRef}
        aria-labelledby={headingId}
        {...{
          ...(selectable && { role: 'option', 'aria-selected': !!selected }),
          className: 'flex'
        }}
      >
        {variant === 'ordered-draggable' && (
          <div role='none' {...slots.dragHandle} className={mx('bs-10 is-5', slots.dragHandle?.className)}>
            <DotsSixVertical className={mx(getSize(5), 'mbs-2.5')} />
          </div>
        )}
        <div role='none' className={defaultListItemEndcap}>
          {selectable ? (
            <Checkbox
              labelId={headingId}
              className='mbs-2.5'
              {...{ checked: selected, onCheckedChange: setSelected }}
            />
          ) : (
            before
          )}
        </div>
        {selectable && before && (
          <div role='none' className={defaultListItemEndcap}>
            {before}
          </div>
        )}
        <div
          role='none'
          {...slots.heading}
          className={mx(defaultListItemHeading, slots.heading?.className)}
          id={headingId}
        >
          {children}
        </div>
        <div role='none' className={defaultListItemEndcap}>
          {after}
        </div>
      </Primitive.li>
    </Collection.ItemSlot>
  );
});

const DraggableListItem = forwardRef<ListItemElement, ListItemProps>(
  (props: ScopedProps<ListItemProps>, forwardedRef) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: props.id!
    });
    const ref = useComposedRefs(forwardedRef, setNodeRef) as ComponentPropsWithRef<typeof Primitive.li>['ref'];

    return (
      <Collection.Slot scope={props.__scopeSelect}>
        <PureListItem
          {...props}
          ref={ref}
          slots={{
            root: { style: { transform: CSS.Transform.toString(transform), transition } },
            dragHandle: { ...listeners, ...attributes }
          }}
        />
      </Collection.Slot>
    );
  }
);

const ListItem = forwardRef<ListItemElement, ListItemProps>((props: ScopedProps<ListItemProps>, forwardedRef) => {
  const { variant } = useListContext(LIST_NAME, props.__scopeSelect);
  const listItemId = useId('listItem');

  if (variant === 'ordered-draggable') {
    return <DraggableListItem ref={forwardedRef} {...props} id={props.id ?? listItemId} />;
  } else {
    return <PureListItem ref={forwardedRef} {...props} id={props.id ?? listItemId} />;
  }
});

List.displayName = LIST_NAME;

export { List, ListItem };

export type { ListProps, ListVariant, ListItemProps };
