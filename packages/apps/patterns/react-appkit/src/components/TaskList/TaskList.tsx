//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { ChangeEvent, forwardRef, KeyboardEvent, ReactNode, useCallback } from 'react';

import { List, ListItem, useId, DragEndEvent, arrayMove, ListItemHeading, Input } from '@dxos/react-components';

export interface TaskListItemProps {
  [key: string]: any;
  id: string;
  defaultCompleted?: boolean;
  completed?: boolean;
  onCompletedChange?: (completed: boolean) => void;
  defaultTitle?: string;
  title?: string;
  onTitleChange?: (event: ChangeEvent<HTMLParagraphElement>) => void;
}

export interface TaskListProps {
  [key: string]: any;
  id: string;
  defaultTitle?: string;
  title?: string;
  onTitleChange?: (event: ChangeEvent<HTMLHeadingElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onItemIdOrderChange?: () => void;
  children?: ReactNode;
}

export const useTaskListKeyboardInteractions = (hostId: string) => {
  const onListItemInputKeyDown = useCallback(
    (event: KeyboardEvent<Element>) => {
      const inputsInScope = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `ol[data-focus-series-host="${hostId}"] input[data-focus-series="taskList"]`
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

export const TaskList = forwardRef<HTMLOListElement, TaskListProps>(
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
    }: TaskListProps,
    forwardedRef
  ) => {
    const headingId = useId(`taskList-${id}__heading`);
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
            label: 'Task list heading',
            placeholder: 'Task list heading',
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

export const TaskListItem = forwardRef<HTMLLIElement, TaskListItemProps>(
  (
    { id, defaultCompleted, completed, onCompletedChange, defaultTitle, title, onTitleChange }: TaskListItemProps,
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
              label: 'Task heading',
              placeholder: 'Task heading',
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
