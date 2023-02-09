//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { ChangeEvent, forwardRef, KeyboardEvent, ReactNode, useCallback } from 'react';

import { List, ListItem, useId, DragEndEvent, arrayMove, ListItemHeading, Input } from '@dxos/react-components';

export interface CrudListItemProps {
  [key: string]: any;
  id: string;
  defaultCompleted?: boolean;
  completed?: boolean;
  onCompletedChange?: (completed: boolean) => void;
  defaultTitle?: string;
  title?: string;
  onTitleChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onItemIdOrderChange?: (itemIdOrder: string[]) => void;
}

export interface CrudListProps {
  [key: string]: any;
  id: string;
  defaultTitle?: string;
  title?: string;
  onTitleChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onItemIdOrderChange?: () => void;
  children?: ReactNode;
}

export const useCrudListKeyboardInteractions = (hostId: string) => {
  const onListItemInputKeyDown = useCallback(
    (event: KeyboardEvent<Element>) => {
      const inputsInScope = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `ol[data-focus-series-host="${hostId}"] input[data-focus-series="crudList"]`
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
  return { onListItemInputKeyDown };
};

export const CrudList = forwardRef<HTMLOListElement, CrudListProps>(
  (
    {
      id,
      children,
      title,
      defaultTitle,
      onTitleChange,
      defaultItemIdOrder,
      itemIdOrder,
      onItemIdOrderChange
    }: CrudListProps,
    forwardedRef
  ) => {
    const headingId = useId(`crudList-${id}__heading`);
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
      <>
        <Input
          {...{
            variant: 'subdued',
            label: 'Crud list heading',
            placeholder: 'Crud list heading',
            slots: { root: { className: 'm-0' }, label: { className: 'sr-only' } },
            size: 'lg',
            value: title,
            defaultValue: defaultTitle,
            onChange: onTitleChange
          }}
        >
          {title ?? defaultTitle}
        </Input>
        <List
          // ref={forwardedRef}
          labelId={headingId}
          variant='ordered-draggable'
          selectable
          onDragEnd={handleDragEnd}
          listItemIds={listItemIds ?? []}
        >
          {children}
        </List>
        <Input
          variant='subdued'
          label='Add new item'
          placeholder='Add new item'
          slots={{ root: { className: 'mbs-0' }, label: { className: 'sr-only' } }}
        />
      </>
    );
  }
);

export const CrudListItem = forwardRef<HTMLLIElement, CrudListItemProps>(
  (
    { id, defaultCompleted, completed, onCompletedChange, defaultTitle, title, onTitleChange }: CrudListItemProps,
    forwardedRef
  ) => {
    return (
      <ListItem
        ref={forwardedRef}
        {...{
          id,
          defaultSelected: defaultCompleted,
          selected: completed,
          onSelectedChange: onCompletedChange
        }}
      >
        <ListItemHeading>
          <Input
            {...{
              variant: 'subdued',
              label: 'Crud heading',
              placeholder: 'Crud heading',
              slots: { root: { className: 'm-0' }, label: { className: 'sr-only' } },
              value: title,
              defaultValue: defaultTitle,
              onChange: onTitleChange
            }}
          >
            {title ?? defaultTitle}
          </Input>
        </ListItemHeading>
      </ListItem>
    );
  }
);
