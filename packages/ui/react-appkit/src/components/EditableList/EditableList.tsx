//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { X, Plus } from '@phosphor-icons/react';
import React, { ChangeEvent, ComponentPropsWithoutRef, forwardRef, KeyboardEvent, ReactNode, useCallback } from 'react';

import {
  Button,
  useTranslation,
  ButtonProps,
  Density,
  DensityProvider,
  List,
  ListItem,
  ListItemHeading,
  ListItemEndcap,
  useListDensity
} from '@dxos/aurora';
import { mx, getSize, defaultDescription } from '@dxos/aurora-theme';

import { Input, InputProps } from '../Input';
import { Tooltip } from '../Tooltip';

export interface EditableListItemSlots {
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
  density?: Density;
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
  density: propsDensity,
  slots = {}
}: EditableListProps) => {
  const { t } = useTranslation('appkit');
  const density = useListDensity({ density: propsDensity, variant });

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
        variant={variant}
        selectable={completable}
        onDragEnd={handleDragEnd}
        listItemIds={itemIdOrder ?? []}
        density={density}
      >
        {children}
      </List>
      <div className='flex'>
        <DensityProvider density={density}>
          {/* todo(thure): Find a way to mock this? */}
          {/* <ListItemDragHandle className={variant === 'ordered-draggable' ? 'invisible' : 'hidden'} /> */}
          <ListItemEndcap className='invisible' />
          <Input
            variant='subdued'
            label={t('new list item input label')}
            labelVisuallyHidden
            placeholder={t('new list item input placeholder')}
            {...{
              value: nextItemTitle,
              defaultValue: defaultNextItemTitle,
              onChange: onChangeNextItemTitle
            }}
            slots={{
              ...slots.addItemInput,
              root: {
                ...slots.addItemInput?.root,
                className: mx('grow', slots.addItemInput?.root?.className)
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
                {...slots.addItemButton}
                className={mx('p-1', slots.addItemButton?.className)}
                onClick={onClickAdd}
              >
                <Plus className={getSize(4)} />
              </Button>
            </Tooltip>
          </ListItemEndcap>
        </DensityProvider>
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
          onSelectedChange: onChangeCompleted
        }}
      >
        <ListItemHeading className='sr-only'>{title}</ListItemHeading>
        <Input
          {...{
            variant: 'subdued',
            label: t('list item input label'),
            labelVisuallyHidden: true,
            placeholder: t('list item input placeholder'),
            slots: {
              ...slots.input,
              root: {
                ...slots.input?.root,
                className: mx('grow', slots.input?.root?.className)
              }
            },
            value: title,
            defaultValue: defaultTitle,
            onChange: onChangeTitle
          }}
        >
          {title ?? defaultTitle}
        </Input>
        {onClickDelete && (
          <ListItemEndcap>
            <Tooltip content={t('delete list item label')} side='left' tooltipLabelsTrigger>
              <Button variant='ghost' className='p-1' onClick={onClickDelete}>
                <X className={getSize(4)} />
              </Button>
            </Tooltip>
          </ListItemEndcap>
        )}
      </ListItem>
    );
  }
);
