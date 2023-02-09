//
// Copyright 2023 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createCollection } from '@radix-ui/react-collection';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContextScope } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { DotsSixVertical } from 'phosphor-react';
import React, {
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  FC,
  forwardRef,
  ReactNode
} from 'react';

import { useId, useThemeContext } from '../../hooks';
import { ScopedProps } from '../../props';
import { getSize, themeVariantFocus } from '../../styles';
import { mx } from '../../util';
import { Checkbox, CheckboxProps } from '../Checkbox';
import { defaultListItemHeading, defaultListItemEndcap } from './listStyles';

// TODO (thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';
const LIST_ITEM_NAME = 'ListItem';

type ListVariant = 'ordered' | 'unordered' | 'ordered-draggable';

interface SharedListSlots {
  root?: ComponentPropsWithoutRef<'ul' | 'ol'>;
}

interface DraggableListSlots extends SharedListSlots {
  dndContext?: Omit<ComponentProps<typeof DndContext>, 'onDragEnd'>;
  sortableContext?: Omit<ComponentProps<typeof SortableContext>, 'items'>;
}

interface SharedListProps {
  labelId: string;
  children?: ReactNode;
  selectable?: boolean;
  variant?: ListVariant;
  onDragEnd?: ComponentPropsWithoutRef<typeof DndContext>['onDragEnd'];
  listItemIds?: string[];
  slots?: SharedListSlots;
}

interface DraggableListProps extends Omit<SharedListProps, 'onDragEnd' | 'listItemIds' | 'variant' | 'slots'> {
  onDragEnd: Exclude<SharedListProps['onDragEnd'], undefined>;
  listItemIds: Exclude<SharedListProps['listItemIds'], undefined>;
  variant: 'ordered-draggable';
  slots?: DraggableListSlots;
}

type ListProps = SharedListProps | DraggableListProps;

interface ListItemData {
  id: string;
  selected?: CheckboxProps['checked'];
}

interface ListItemSlots {
  root?: Omit<ComponentPropsWithRef<'li'>, 'id' | 'children'>;
  dragHandle?: ComponentPropsWithoutRef<typeof ListItemDragHandle>;
}

interface ListItemProps extends Omit<ListItemData, 'id'> {
  children?: ReactNode;
  onSelectedChange?: CheckboxProps['onCheckedChange'];
  defaultSelected?: CheckboxProps['defaultChecked'];
  slots?: ListItemSlots;
  id?: string;
}

// COLLECTION

type ListItemElement = React.ElementRef<typeof Primitive.li>;

const [Collection, useListCollection, createCollectionScope] = createCollection<ListItemElement, ListItemData>(
  LIST_NAME
);

// LIST

const [createListContext, createListScope] = createContextScope(LIST_NAME, [createCollectionScope]);

type ListContextValue = Pick<ListProps, 'selectable' | 'variant'>;

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const List: FC<ListProps> = (props: ScopedProps<ListProps>) => {
  const { __scopeSelect, variant = 'ordered', selectable = false, children, slots = {} } = props;
  const ListRoot = variant === 'ordered' || variant === 'ordered-draggable' ? Primitive.ol : Primitive.ul;

  return (
    <ListRoot
      {...(selectable && { role: 'listbox', 'aria-multiselectable': true })}
      {...slots.root}
      aria-labelledby={props.labelId}
    >
      <ListProvider
        {...{
          scope: __scopeSelect,
          variant,
          selectable
        }}
      >
        <Collection.Provider scope={__scopeSelect}>
          {variant === 'ordered-draggable' ? (
            <DndContext onDragEnd={(props as DraggableListProps).onDragEnd} modifiers={[restrictToVerticalAxis]}>
              <SortableContext items={(props as DraggableListProps).listItemIds}>{children}</SortableContext>
            </DndContext>
          ) : (
            <>{children}</>
          )}
        </Collection.Provider>
      </ListProvider>
    </ListRoot>
  );
};

List.displayName = LIST_NAME;

// LIST ITEM

const [createListItemContext, createListItemScope] = createContextScope(LIST_ITEM_NAME, []);

type ListItemContextValue = { headingId: string };

const [ListItemProvider, useListItemContext] = createListItemContext<ListItemContextValue>(LIST_ITEM_NAME);

const ListItemEndcap = ({ children, className, ...props }: ComponentPropsWithoutRef<'div'>) => {
  return (
    <div role='none' {...props} className={mx(defaultListItemEndcap, className)}>
      {children}
    </div>
  );
};

const ListItemHeading = ({
  children,
  className,
  __scopeSelect,
  ...props
}: ScopedProps<ComponentPropsWithoutRef<'div'>>) => {
  const { headingId } = useListItemContext(LIST_ITEM_NAME, __scopeSelect);
  return (
    <div role='none' {...props} id={headingId} className={mx(defaultListItemHeading, className)}>
      {children}
    </div>
  );
};

const ListItemDragHandle = ({ className, ...props }: Omit<ComponentPropsWithoutRef<'div'>, 'children'>) => {
  const { themeVariant } = useThemeContext();
  return (
    <div role='button' {...props} className={mx('bs-10 is-5 rounded', themeVariantFocus(themeVariant), className)}>
      <DotsSixVertical className={mx(getSize(5), 'mbs-2.5')} />
    </div>
  );
};

const PureListItem = forwardRef<ListItemElement, ListItemProps & { id: string }>(
  (props: ScopedProps<ListItemProps & { id: string }>, forwardedRef) => {
    const {
      __scopeSelect,
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
      <Collection.ItemSlot id={id} scope={__scopeSelect} selected={selected}>
        <ListItemProvider scope={__scopeSelect} headingId={headingId}>
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
              <ListItemDragHandle {...slots.dragHandle} className={slots.dragHandle?.className} />
            )}
            {selectable && (
              <ListItemEndcap>
                <Checkbox
                  labelId={headingId}
                  className='mbs-2.5'
                  {...{ checked: selected, onCheckedChange: setSelected }}
                />
              </ListItemEndcap>
            )}
            {children}
          </Primitive.li>
        </ListItemProvider>
      </Collection.ItemSlot>
    );
  }
);

const DraggableListItem = forwardRef<ListItemElement, ListItemProps & { id: string }>(
  (props: ScopedProps<ListItemProps & { id: string }>, forwardedRef) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: props.id
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
    return <DraggableListItem {...props} ref={forwardedRef} id={props.id ?? listItemId} />;
  } else {
    return <PureListItem {...props} ref={forwardedRef} id={props.id ?? listItemId} />;
  }
});

export { List, createListScope, useListCollection, ListItem, ListItemHeading, ListItemEndcap, createListItemScope };

export type { ListProps, ListVariant, ListItemProps };
