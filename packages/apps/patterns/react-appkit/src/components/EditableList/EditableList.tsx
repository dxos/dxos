//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Plus } from 'phosphor-react';
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
  mx,
  Button,
  getSize,
  useTranslation
} from '@dxos/react-components';

export interface EditableListItemSlots {
  listItem?: ListItemProps['slots'];
  input?: InputProps['slots'];
}

export interface EditableListItemProps {
  id: string;
  defaultCompleted?: boolean;
  completed?: boolean;
  onChangeCompleted?: (completed: boolean) => void;
  defaultTitle?: string;
  title?: string;
  onChangeTitle?: (event: ChangeEvent<HTMLInputElement>) => void;
  slots?: EditableListItemSlots;
}

export interface EditableListSlots {
  root?: Omit<ComponentPropsWithoutRef<'div'>, 'children'>;
  listHeading?: InputProps['slots'];
  list?: ListProps['slots'];
  addItem?: InputProps['slots'];
}

export interface EditableListProps {
  id: string;
  labelId: string;
  completable?: boolean;
  onClickAdd?: () => void;
  defaultNextItemTitle?: string;
  nextItemTitle?: string;
  onChangeNextItemTitle?: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onChangeItemIdOrder?: (itemIdOrder: string[]) => void;
  children?: ReactNode;
  slots?: EditableListSlots;
}

const focusAndSetCaretPosition = (prevEl: HTMLInputElement, nextEl: HTMLInputElement) => {
  const pos = prevEl.selectionStart ?? 0;
  if ('selectionStart' in nextEl) {
    nextEl.focus();
    nextEl.setSelectionRange(pos, pos);
  } else {
    nextEl.focus();
  }
};

export const useEditableListKeyboardInteractions = (hostId: string) => {
  const hostAttrs = { 'data-focus-series-host': hostId };
  const itemAttrs = { 'data-focus-series': 'editableList' };
  const onListItemInputKeyDown = useCallback(
    (event: KeyboardEvent<Element>) => {
      const inputsInScope = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `[data-focus-series-host="${hostId}"] [data-focus-series="editableList"]`
        )
      );
      const targetIndex = inputsInScope.findIndex((sibling) => sibling === event.target);
      switch (event.key) {
        case 'Enter':
        case 'PageDown': {
          if (targetIndex < inputsInScope.length - 1) {
            event.preventDefault();
            focusAndSetCaretPosition(event.target as HTMLInputElement, inputsInScope[targetIndex + 1]);
          }
          break;
        }
        case 'PageUp': {
          if (targetIndex > 0) {
            event.preventDefault();
            focusAndSetCaretPosition(event.target as HTMLInputElement, inputsInScope[targetIndex - 1]);
          }
          break;
        }
      }
    },
    [hostId]
  );

  return { onListItemInputKeyDown, hostAttrs, itemAttrs };
};

export const EditableList = ({
  children,
  labelId,
  completable,
  onClickAdd,
  nextItemTitle,
  defaultNextItemTitle,
  onChangeNextItemTitle,
  defaultItemIdOrder,
  itemIdOrder,
  onChangeItemIdOrder,
  slots = {}
}: EditableListProps) => {
  const [listItemIds, setListItemIds] = useControllableState({
    prop: itemIdOrder,
    defaultProp: defaultItemIdOrder,
    onChange: onChangeItemIdOrder
  });
  const { t } = useTranslation('appkit');

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
        selectable={completable}
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
            onChange: onChangeNextItemTitle
          }}
          slots={{
            input: {
              ...slots.addItem?.input,
              className: mx('p-2', slots.addItem?.input?.className)
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
        <ListItemEndcap>
          <Button variant='ghost' compact className={getSize(10)} onClick={onClickAdd}>
            <Plus weight='bold' className={getSize(4)} />
            <span className='sr-only'>{t('add list item label')}</span>
          </Button>
        </ListItemEndcap>
      </div>
    </div>
  );
};

export const EditableListItem = forwardRef<HTMLLIElement, EditableListItemProps>(
  (
    {
      id,
      defaultCompleted,
      completed,
      onChangeCompleted,
      defaultTitle,
      title,
      onChangeTitle,
      slots = {}
    }: EditableListItemProps,
    forwardedRef
  ) => {
    return (
      <ListItem
        ref={forwardedRef}
        {...{
          id,
          defaultSelected: defaultCompleted,
          selected: completed,
          onSelectedChange: onChangeCompleted,
          slots: slots.listItem
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
                  className: mx('p-2', slots.input?.input?.className)
                },
                label: {
                  ...slots.input?.label,
                  className: mx('sr-only', slots.input?.label?.className)
                }
              },
              value: title,
              defaultValue: defaultTitle,
              onChange: onChangeTitle
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
