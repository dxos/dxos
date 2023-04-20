//
// Copyright 2023 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CaretDown, CaretRight, DotsSixVertical } from '@phosphor-icons/react';
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
  forwardRef,
  ReactHTMLElement,
  ReactNode
} from 'react';

import { useDensityContext, useId, useThemeContext } from '../../hooks';
import { Density } from '../../props';
import { coarseBlockSize, fineBlockSize, getSize, themeVariantFocus } from '../../styles';
import { mx } from '../../util';
import { Checkbox, CheckboxProps } from '../Checkbox';
import { DensityProvider } from '../DensityProvider';
import { defaultListItemEndcap, defaultListItemHeading, defaultListItemMainContent } from './listStyles';

// TODO(thure): A lot of the accessible affordances for this kind of thing need to be implemented per https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/listbox_role

const LIST_NAME = 'List';
const LIST_ITEM_NAME = 'ListItem';

type ListScopedProps<P> = P & { __listScope?: Scope };

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
  collapsible?: boolean;
  variant?: ListVariant;
  onDragEnd?: ComponentPropsWithoutRef<typeof DndContext>['onDragEnd'];
  listItemIds?: string[];
  slots?: SharedListSlots;
  density?: Density;
  toggleOpenLabel?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
}

interface DraggableListProps
  extends Omit<SharedListProps, 'onDragEnd' | 'listItemIds' | 'variant' | 'slots' | 'density'> {
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
  dragHandleIcon?: ComponentPropsWithoutRef<typeof DotsSixVertical>;
  openTrigger?: ComponentPropsWithoutRef<typeof ListItemOpenTrigger>;
  openTriggerIcon?: ComponentPropsWithoutRef<typeof CaretDown>;
  mainContent?: ComponentPropsWithoutRef<'div'>;
  selectableCheckbox?: Omit<CheckboxProps, 'default' | 'checked' | 'onCheckedChange'>;
  selectableEndcap?: Omit<ListItemEndcapProps, 'children'>;
}

interface NonCollapsibleListItemProps extends Omit<ListItemData, 'id'> {
  children?: ReactNode;
  onSelectedChange?: CheckboxProps['onCheckedChange'];
  defaultSelected?: CheckboxProps['defaultChecked'];
  slots?: ListItemSlots;
  id?: string;
  collapsible?: false;
}

interface CollapsibleListItemProps extends Omit<NonCollapsibleListItemProps, 'collapsible'> {
  collapsible: true;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
}

type ListItemProps = NonCollapsibleListItemProps | CollapsibleListItemProps;

type ListItemElement = React.ElementRef<typeof Primitive.li>;

// LIST

const [createListContext, createListScope] = createContextScope(LIST_NAME, []);

type ListContextValue = Pick<ListProps, 'selectable' | 'collapsible' | 'variant' | 'toggleOpenLabel'>;

const [ListProvider, useListContext] = createListContext<ListContextValue>(LIST_NAME);

const useListDensity = ({ density, variant }: Pick<SharedListProps, 'density' | 'variant'>) => {
  const contextDensity = useDensityContext(density);
  return variant === 'ordered-draggable' ? 'coarse' : contextDensity ?? 'coarse';
};

const List = forwardRef<HTMLOListElement, ListProps>((props: ListScopedProps<ListProps>, forwardedRef) => {
  const {
    __listScope,
    variant = 'ordered',
    selectable = false,
    collapsible = false,
    toggleOpenLabel = 'Expand/collapse item',
    children,
    slots = {}
  } = props;
  const ListRoot = variant === 'ordered' || variant === 'ordered-draggable' ? Primitive.ol : Primitive.ul;
  const density = useListDensity(props);
  return (
    <ListRoot
      {...(selectable && { role: 'listbox', 'aria-multiselectable': true })}
      {...slots.root}
      aria-labelledby={props.labelId}
      ref={forwardedRef}
    >
      <DensityProvider density={density}>
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
      </DensityProvider>
    </ListRoot>
  );
});

List.displayName = LIST_NAME;

// LIST ITEM

const [createListItemContext, createListItemScope] = createContextScope(LIST_ITEM_NAME, []);

type ListItemContextValue = { headingId: string; open: boolean };

const [ListItemProvider, useListItemContext] = createListItemContext<ListItemContextValue>(LIST_ITEM_NAME);

type ListItemEndcapProps = ComponentPropsWithoutRef<'div'> & { asChild?: boolean };

const ListItemEndcap = ({ children, className, asChild, ...props }: ListItemEndcapProps) => {
  const Root = asChild ? Slot : 'div';
  const density = useDensityContext();
  return (
    <Root {...(!asChild && { role: 'none' })} {...props} className={mx(defaultListItemEndcap({ density }), className)}>
      {children}
    </Root>
  );
};

type ListItemHeadingProps = ListScopedProps<ComponentPropsWithoutRef<'p'>> & { asChild?: boolean };

const ListItemHeading = ({ children, className, asChild, __listScope, ...props }: ListItemHeadingProps) => {
  const { headingId } = useListItemContext(LIST_ITEM_NAME, __listScope);
  const Root = asChild ? Slot : 'div';
  const density = useDensityContext();
  return (
    <Root {...props} id={headingId} className={mx(defaultListItemHeading({ density }), className)}>
      {children}
    </Root>
  );
};

type ListItemDragHandleProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  dragHandleIconSlot?: ListItemSlots['dragHandleIcon'];
};

const ListItemDragHandle = ({ className, dragHandleIconSlot = {}, ...props }: ListItemDragHandleProps) => {
  const { themeVariant } = useThemeContext();
  return (
    <div
      role='button'
      {...props}
      className={mx('bs-10 is-5 rounded touch-none', themeVariantFocus(themeVariant), className)}
    >
      <DotsSixVertical {...dragHandleIconSlot} className={mx(getSize(5), 'mbs-2.5', dragHandleIconSlot.className)} />
    </div>
  );
};

type ListItemOpenTriggerProps = ListScopedProps<Omit<ComponentPropsWithoutRef<'button'>, 'children'>> & {
  openTriggerIconSlot?: ListItemSlots['dragHandleIcon'];
};

const ListItemOpenTrigger = forwardRef<HTMLButtonElement, ListItemOpenTriggerProps>(
  ({ className, openTriggerIconSlot = {}, __listScope, ...props }: ListItemOpenTriggerProps, forwardedRef) => {
    const { themeVariant } = useThemeContext();
    const density = useDensityContext();
    const { toggleOpenLabel } = useListContext(LIST_NAME, __listScope);
    const { open } = useListItemContext(LIST_ITEM_NAME, __listScope);
    const iconProps: ListItemOpenTriggerProps['openTriggerIconSlot'] = {
      weight: 'bold',
      ...openTriggerIconSlot,
      className: mx(getSize(3.5), openTriggerIconSlot.className)
    };
    const Icon = open ? CaretDown : CaretRight;
    return (
      <Collapsible.Trigger
        ref={forwardedRef}
        {...props}
        className={mx(
          'is-5 rounded flex justify-center items-center',
          density === 'fine' ? fineBlockSize : coarseBlockSize,
          themeVariantFocus(themeVariant),
          className
        )}
      >
        {typeof toggleOpenLabel === 'string' ? <span className='sr-only'>{toggleOpenLabel}</span> : toggleOpenLabel}
        <Icon {...iconProps} />
      </Collapsible.Trigger>
    );
  }
);

const PureListItem = forwardRef<ListItemElement, ListItemProps & { id: string }>(
  (props: ListScopedProps<ListItemProps & { id: string }>, forwardedRef) => {
    const {
      __listScope,
      children,
      selected: propsSelected,
      defaultSelected,
      onSelectedChange,
      collapsible,
      id,
      slots = {}
    } = props;
    const density = useDensityContext();
    const { variant, selectable, collapsible: listCollapsible } = useListContext(LIST_NAME, __listScope);
    const draggable = variant === 'ordered-draggable';

    const [selected = false, setSelected] = useControllableState({
      prop: propsSelected,
      defaultProp: defaultSelected,
      onChange: onSelectedChange
    });

    const [open = false, setOpen] = useControllableState({
      prop: (props as CollapsibleListItemProps).open,
      defaultProp: (props as CollapsibleListItemProps).defaultOpen,
      onChange: (props as CollapsibleListItemProps).onOpenChange
    });

    const headingId = useId('listItem__heading');

    const listItem = (
      <Primitive.li
        {...slots.root}
        id={id}
        ref={forwardedRef}
        aria-labelledby={headingId}
        {...(selectable && { role: 'option', 'aria-selected': !!selected })}
        className={mx('flex', slots.root?.className)}
      >
        {draggable && <ListItemDragHandle {...slots.dragHandle} dragHandleIconSlot={slots.dragHandleIcon} />}
        {listCollapsible && (
          <div role='none' className={mx('is-5', density === 'fine' ? fineBlockSize : coarseBlockSize)}>
            {collapsible && <ListItemOpenTrigger {...slots.openTrigger} openTriggerIconSlot={slots.openTriggerIcon} />}
          </div>
        )}
        {selectable && (
          <ListItemEndcap {...slots.selectableEndcap}>
            <Checkbox
              {...slots.selectableCheckbox}
              labelId={headingId}
              className={mx(density === 'fine' ? 'mbs-1.5' : 'mbs-2.5', slots.selectableCheckbox?.className)}
              {...{ checked: selected, onCheckedChange: setSelected }}
            />
          </ListItemEndcap>
        )}
        <div
          role='none'
          {...slots.mainContent}
          className={mx(defaultListItemMainContent({ collapsible: listCollapsible }), slots.mainContent?.className)}
        >
          {children}
        </div>
      </Primitive.li>
    );

    return (
      <ListItemProvider scope={__listScope} headingId={headingId} open={open}>
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

type ListItemCollapsibleContentProps = ComponentProps<typeof Collapsible.Content>;

const ListItemCollapsibleContent = Collapsible.Content;

const DraggableListItem = forwardRef<ListItemElement, ListItemProps & { id: string }>(
  (props: ListScopedProps<ListItemProps & { id: string }>, forwardedRef) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
      id: props.id
    });
    const ref = useComposedRefs(forwardedRef, setNodeRef) as ComponentPropsWithRef<typeof Primitive.li>['ref'];

    return (
      <PureListItem
        {...props}
        ref={ref}
        slots={{
          ...props.slots,
          root: {
            ...props.slots?.root,
            style: { transform: CSS.Transform.toString(transform), transition, ...props.slots?.root?.style }
          },
          dragHandle: { ...listeners, ...attributes, ...props.slots?.dragHandle }
        }}
      />
    );
  }
);

const ListItem = forwardRef<ListItemElement, ListItemProps>((props: ListScopedProps<ListItemProps>, forwardedRef) => {
  const { variant } = useListContext(LIST_NAME, props.__listScope);
  const listItemId = useId('listItem');

  if (variant === 'ordered-draggable') {
    return <DraggableListItem {...props} ref={forwardedRef} id={props.id ?? listItemId} />;
  } else {
    return <PureListItem {...props} ref={forwardedRef} id={props.id ?? listItemId} />;
  }
});

export {
  List,
  createListScope,
  useListDensity,
  useListContext,
  LIST_NAME,
  ListItem,
  ListItemHeading,
  ListItemCollapsibleContent,
  ListItemEndcap,
  ListItemDragHandle,
  ListItemOpenTrigger,
  createListItemScope,
  useListItemContext,
  LIST_ITEM_NAME
};

export type {
  ListProps,
  ListVariant,
  ListItemProps,
  ListItemHeadingProps,
  ListItemCollapsibleContentProps,
  ListItemEndcapProps,
  ListItemDragHandleProps,
  ListItemOpenTriggerProps,
  ListScopedProps
};
