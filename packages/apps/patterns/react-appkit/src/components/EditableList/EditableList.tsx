//
// Copyright 2023 DXOS.org
//

import { DotsThree, Plus, X } from 'phosphor-react';
import React, { ChangeEvent, ComponentPropsWithoutRef, forwardRef, KeyboardEvent, ReactNode, useCallback } from 'react';

import {
  List,
  ListItem,
  DragEndEvent,
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
  useTranslation,
  DropdownMenu,
  DropdownMenuItem,
  valenceColorText,
  Tooltip,
  defaultDescription,
  ButtonProps
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
  onClickDelete?: () => void;
  slots?: EditableListItemSlots;
}

export interface EditableListSlots {
  root?: Omit<ComponentPropsWithoutRef<'div'>, 'children'>;
  listHeading?: InputProps['slots'];
  list?: ListProps['slots'];
  addItemInput?: InputProps['slots'];
  addItemButton?: ButtonProps;
}

export interface EditableListProps {
  id: string;
  labelId: string;
  completable?: boolean;
  variant?: 'ordered-draggable' | 'unordered';
  onClickAdd?: () => void;
  defaultNextItemTitle?: string;
  nextItemTitle?: string;
  onChangeNextItemTitle?: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onMoveItem?: (oldIndex: number, newIndex: number) => void;
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
  variant = 'ordered-draggable',
  onClickAdd,
  nextItemTitle,
  defaultNextItemTitle,
  onChangeNextItemTitle,
  itemIdOrder,
  onMoveItem,
  slots = {}
}: EditableListProps) => {
  const { t } = useTranslation('appkit');

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (itemIdOrder && over?.id && active.id !== over?.id) {
      const oldIndex = itemIdOrder.findIndex((id) => id === active.id);
      const newIndex = itemIdOrder.findIndex((id) => id === over.id);
      onMoveItem?.(oldIndex, newIndex);
    }
  };

  return (
    <div role='none' {...slots.root} className={mx('contents', slots.root?.className)}>
      <List
        labelId={labelId}
        variant={variant}
        selectable={completable}
        onDragEnd={handleDragEnd}
        listItemIds={itemIdOrder ?? []}
        slots={slots.list}
      >
        {children}
      </List>
      <div className='flex'>
        <ListItemDragHandle className='invisible' />
        <ListItemEndcap className='invisible' />
        <Input
          variant='subdued'
          label={t('new list item input label')}
          placeholder={t('new list item input placeholder')}
          {...{
            value: nextItemTitle,
            defaultValue: defaultNextItemTitle,
            onChange: onChangeNextItemTitle
          }}
          slots={{
            input: {
              ...slots.addItemInput?.input,
              className: mx('p-2', slots.addItemInput?.input?.className)
            },
            root: {
              ...slots.addItemInput?.root,
              className: mx('grow mbs-0', slots.addItemInput?.root?.className)
            },
            label: {
              ...slots.addItemInput?.label,
              className: mx('sr-only', slots.addItemInput?.label?.className)
            }
          }}
        />
        <ListItemEndcap>
          <Tooltip
            content={
              <>
                <span className='mie-2'>{t('add list item label')}</span>
                <span className={defaultDescription}>⏎</span>
              </>
            }
            side='left'
            tooltipLabelsTrigger
          >
            <Button
              variant='ghost'
              compact
              {...slots.addItemButton}
              className={mx(getSize(10), slots.addItemButton?.className)}
              onClick={onClickAdd}
            >
              <Plus weight='bold' className={getSize(4)} />
            </Button>
          </Tooltip>
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
      onClickDelete,
      slots = {}
    }: EditableListItemProps,
    forwardedRef
  ) => {
    const { t } = useTranslation('appkit');
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
              label: t('list item input label'),
              placeholder: t('list item input placeholder'),
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
        <ListItemEndcap>
          <DropdownMenu
            trigger={
              <Button variant='ghost' compact className={getSize(10)}>
                <DotsThree weight='light' className={getSize(4)} />
              </Button>
            }
          >
            <DropdownMenuItem onClick={onClickDelete} className={valenceColorText('error')}>
              <span className='grow'>{t('delete list item label')}</span>
              <X className={getSize(4)} />
            </DropdownMenuItem>
          </DropdownMenu>
        </ListItemEndcap>
      </ListItem>
    );
  }
);
