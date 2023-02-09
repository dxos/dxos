//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { ChangeEvent, ComponentPropsWithoutRef, forwardRef, KeyboardEvent, ReactNode, useCallback } from 'react';

import {
  List,
  ListItem,
  DragEndEvent,
  arrayMove,
  ListItemHeading,
  Input,
  ListItemEndcap,
  ListItemDragHandle,
  ListProps,
  InputProps,
  ListItemProps,
  mx
} from '@dxos/react-components';

export interface CrudListItemSlots {
  listItem?: ListItemProps['slots'];
  input?: InputProps['slots'];
}

export interface CrudListItemProps {
  id: string;
  defaultCompleted?: boolean;
  completed?: boolean;
  onCompletedChange?: (completed: boolean) => void;
  defaultTitle?: string;
  title?: string;
  onTitleChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  slots?: CrudListItemSlots;
}

export interface CrudListSlots {
  root?: Omit<ComponentPropsWithoutRef<'div'>, 'children'>;
  listHeading?: InputProps['slots'];
  list?: ListProps['slots'];
  addItem?: InputProps['slots'];
}

export interface CrudListProps {
  id: string;
  labelId: string;
  defaultNextItemTitle?: string;
  nextItemTitle?: string;
  onNextItemTitleChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onItemIdOrderChange?: (itemIdOrder: string[]) => void;
  children?: ReactNode;
  slots?: CrudListSlots;
}

export const useCrudListKeyboardInteractions = (hostId: string) => {
  const hostAttrs = { 'data-focus-series-host': hostId };
  const itemAttrs = { 'data-focus-series': 'crudList' };
  const onListItemInputKeyDown = useCallback(
    (event: KeyboardEvent<Element>) => {
      const inputsInScope = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `[data-focus-series-host="${hostId}"] [data-focus-series="crudList"]`
        )
      );
      const targetIndex = inputsInScope.findIndex((sibling) => sibling === event.target);
      switch (event.key) {
        case 'Enter':
        case 'PageDown': {
          if (targetIndex < inputsInScope.length - 1) {
            event.preventDefault();
            inputsInScope[targetIndex + 1].focus();
          }
          break;
        }
        case 'PageUp': {
          if (targetIndex > 0) {
            event.preventDefault();
            inputsInScope[targetIndex - 1].focus();
          }
          break;
        }
      }
    },
    [hostId]
  );
  return { onListItemInputKeyDown, hostAttrs, itemAttrs };
};

export const CrudList = ({
  children,
  labelId,
  nextItemTitle,
  defaultNextItemTitle,
  onNextItemTitleChange,
  defaultItemIdOrder,
  itemIdOrder,
  onItemIdOrderChange,
  slots = {}
}: CrudListProps) => {
  const [listItemIds, setListItemIds] = useControllableState({
    prop: itemIdOrder,
    defaultProp: defaultItemIdOrder,
    onChange: onItemIdOrderChange
  });
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setListItemIds((itemIds) => {
        if (itemIds && over?.id) {
          const oldIndex = itemIds.findIndex((id) => id === active.id);
          const newIndex = itemIds.findIndex((id) => id === over.id);
          return arrayMove(itemIds, oldIndex, newIndex);
        } else {
          return itemIds;
        }
      });
    }
  };
  return (
    <div role='none' {...slots.root} className={mx('contents', slots.root?.className)}>
      <List
        // ref={forwardedRef}
        labelId={labelId}
        variant='ordered-draggable'
        selectable
        onDragEnd={handleDragEnd}
        listItemIds={listItemIds ?? []}
        slots={slots.list}
      >
        {children}
      </List>
      <div className='flex'>
        <ListItemDragHandle className='invisible' />
        <ListItemEndcap className='invisible' />
        <Input
          variant='subdued'
          label='Add new item'
          placeholder='Add new item'
          {...{
            value: nextItemTitle,
            defaultValue: defaultNextItemTitle,
            onChange: onNextItemTitleChange
          }}
          slots={{
            input: {
              ...slots.addItem?.input,
              className: mx('p-1 mbs-1', slots.addItem?.input?.className)
            },
            root: {
              ...slots.addItem?.root,
              className: mx('grow mbs-0', slots.addItem?.root?.className)
            },
            label: {
              ...slots.addItem?.label,
              className: mx('sr-only', slots.addItem?.label?.className)
            }
          }}
        />
        <ListItemEndcap className='invisible' />
      </div>
    </div>
  );
};

export const CrudListItem = forwardRef<HTMLLIElement, CrudListItemProps>(
  (
    {
      id,
      defaultCompleted,
      completed,
      onCompletedChange,
      defaultTitle,
      title,
      onTitleChange,
      slots = {}
    }: CrudListItemProps,
    forwardedRef
  ) => {
    return (
      <ListItem
        ref={forwardedRef}
        {...{
          id,
          defaultSelected: defaultCompleted,
          selected: completed,
          onSelectedChange: onCompletedChange,
          slots
        }}
      >
        <ListItemHeading>
          <Input
            {...{
              variant: 'subdued',
              label: 'Crud heading',
              placeholder: 'Crud heading',
              slots: {
                root: {
                  ...slots.input?.root,
                  className: mx('grow mlb-0', slots.input?.root?.className)
                },
                input: {
                  ...slots.input?.input,
                  className: mx('p-1 mbs-1', slots.input?.input?.className)
                },
                label: {
                  ...slots.input?.label,
                  className: mx('sr-only', slots.input?.label?.className)
                }
              },
              value: title,
              defaultValue: defaultTitle,
              onChange: onTitleChange
            }}
          >
            {title ?? defaultTitle}
          </Input>
          <span className='sr-only'>{title}</span>
        </ListItemHeading>
      </ListItem>
    );
  }
);
