//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import debounce from 'lodash.debounce';
import { Minus, Plus } from 'phosphor-react';
import React, { ComponentProps, useCallback, useMemo, useState, KeyboardEvent } from 'react';

import { Item, Space, ObjectModel, Selection, PublicKey } from '@dxos/client';
import { useSelection, useSpace } from '@dxos/react-client';
import { defaultFocus, Input, useTranslation, getSize, Button, defaultGroup, defaultHover } from '@dxos/react-uikit';

import { usePropStatefully } from '../../hooks';

type ListId = string;
type ListItemId = string;

export interface ListItemProps {
  id: ListItemId;
  title?: string;
  description?: string;
  annotations?: Record<string, string | boolean>;
}

export interface ListPrimitiveProps {
  title?: string;
  description?: string;
}

export interface ListPrimitiveComponentProps extends Omit<ComponentProps<'div'>, 'id'> {
  spaceKey: PublicKey;
  listId: ListId;
  selectList: (listId: ListId, space?: Space) => Selection<Item<ObjectModel>, void> | undefined;
  selectListItem: (listItemId: ListItemId, space?: Space) => Selection<Item<any>, void> | undefined;
  createListItem: (listId: ListId, space?: Space) => Promise<Item<ObjectModel> | undefined>;
  updateList: (list: Item<ObjectModel>, updates: Record<string, string>) => Promise<void[]>;
  updateListItem: (listItem: Item<ObjectModel>, updates: Record<string, string>) => Promise<void[]>;
  selectListItems: (list?: Item<ObjectModel>) => Selection<Item<ObjectModel>, void> | undefined;
  deleteListItem: (listItemId: ListItemId, space?: Space) => Promise<void>;
  onChangePeriod?: number;
}

export interface ListItemPrimitiveComponentProps
  extends Pick<
      ListPrimitiveComponentProps,
      'spaceKey' | 'updateListItem' | 'deleteListItem' | 'selectListItem' | 'onChangePeriod'
    >,
    ComponentProps<'li'> {
  listItemId: ListItemId;
  orderIndex: number;
  isLast?: boolean;
  autoFocus?: boolean;
  createListItem: () => Promise<void>;
}

const ListItemPrimitive = ({
  spaceKey,
  listItemId,
  selectListItem,
  updateListItem,
  deleteListItem,
  createListItem,
  onChangePeriod,
  orderIndex,
  isLast,
  autoFocus
}: ListItemPrimitiveComponentProps) => {
  const checkId = `${listItemId}__checkbox`;
  const labelId = `${listItemId}__title`;
  const descriptionId = `${listItemId}__description`;

  const space = useSpace(spaceKey);
  const listItem = (useSelection<Item<ObjectModel>>(selectListItem(listItemId, space)) ?? [])[0];

  const { t } = useTranslation('appkit');

  const rejectTextUpdatesWhenFocused = useCallback(
    (a: string, b: string) => {
      return document.activeElement?.getAttribute('data-itemid') === listItemId ? true : a === b;
    },
    [listItemId]
  );

  const [title, setTitle, titleSession] = usePropStatefully<string>(
    listItem?.model.get('title') ?? '',
    rejectTextUpdatesWhenFocused
  );
  const propagateTitle = useCallback(
    (nextValue: string) => {
      void updateListItem(listItem, { title: nextValue });
    },
    [updateListItem, listItem]
  );
  const debouncedPropagateTitle = useMemo(() => debounce(propagateTitle, onChangePeriod), [propagateTitle]);
  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      debouncedPropagateTitle(nextValue);
    },
    [debouncedPropagateTitle]
  );

  const [description, _setDescription, _descriptionSession] = usePropStatefully<string>(
    listItem?.model.get('description') ?? '',
    rejectTextUpdatesWhenFocused
  );
  const propagateDescription = useCallback(
    (nextValue: string) => {
      void updateListItem(listItem, { description: nextValue });
    },
    [updateListItem, listItem]
  );
  const debouncedPropagateDescription = useMemo(
    () => debounce(propagateDescription, onChangePeriod),
    [propagateDescription]
  );
  const _onChangeDescription = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      debouncedPropagateDescription(nextValue);
    },
    [debouncedPropagateDescription]
  );

  const [annotations, setAnnotations] = useState(listItem?.model.get('annotations') ?? {});
  const isDone = annotations?.state === 'done';

  const onChangeCheckbox = useCallback(async () => {
    const nextAnnotations = { ...annotations, state: isDone ? 'init' : 'done' };
    setAnnotations(nextAnnotations);
    void updateListItem(listItem, { annotations: nextAnnotations });
  }, [annotations, isDone]);

  const onClickDelete = useCallback(async () => {
    void deleteListItem(listItemId, space);
  }, [space, listItemId]);

  const onKeyUp = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          if (!e.shiftKey) {
            if (isLast) {
              void createListItem();
            } else {
              (
                document.querySelector(`input[data-orderindex="${orderIndex + 1}"]`) as HTMLElement | undefined
              )?.focus();
            }
          }
          break;
        case 'PageDown':
          (document.querySelector(`input[data-orderindex="${orderIndex + 1}"]`) as HTMLElement | undefined)?.focus();
          break;
        case 'PageUp':
          (document.querySelector(`input[data-orderindex="${orderIndex - 1}"]`) as HTMLElement | undefined)?.focus();
          break;
      }
    },
    [orderIndex, isLast]
  );

  return (
    <li
      key={listItemId}
      className='flex items-center gap-2 pli-4 mbe-2'
      aria-labelledby={labelId}
      {...(description && { 'aria-describedby': descriptionId })}
    >
      <input
        key={titleSession}
        {...{
          type: 'checkbox',
          id: checkId,
          ...(description && {
            'aria-describedby': descriptionId
          }),
          className: cx(
            getSize(5),
            'text-primary-600 bg-neutral-50 rounded-full border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 cursor-pointer',
            defaultFocus,
            defaultHover({})
          ),
          onChange: onChangeCheckbox,
          checked: isDone
        }}
      />
      <label htmlFor={checkId} id={labelId} className='sr-only'>
        {title}
      </label>
      <span id={descriptionId} className='sr-only'>
        {description}
      </span>
      <div role='none' className='grow'>
        <Input
          spacing=''
          label={t('list item title label')}
          placeholder={t('list item title placeholder')}
          labelVisuallyHidden
          initialValue={title}
          onChange={onChangeTitle}
          data-itemid={listItemId}
          borders='border-0'
          rounding='rounded'
          autoFocus={autoFocus}
          onKeyUp={onKeyUp}
          data-orderindex={orderIndex}
        />
        {/* TODO(thure): Re-enable this when descriptions become relevant */}
        {/* <Input */}
        {/*  key={descriptionSession} */}
        {/*  label={t('list item description label')} */}
        {/*  placeholder={t('list item description placeholder')} */}
        {/*  labelVisuallyHidden */}
        {/*  initialValue={description} */}
        {/*  onChange={onChangeDescription} */}
        {/*  data-itemid={id} */}
        {/* /> */}
      </div>
      {/* TODO(thure): Restore these, or implement drag & drop, when how best to change order in Echo is clarified. */}
      {/* <ButtonGroup className='flex flex-col items-stretch'> */}
      {/*  <Button compact rounding='rounded-bs-md border-be-0' disabled={isFirst} onClick={onClickMoveUp}> */}
      {/*    <CaretUp /> */}
      {/*    <span className='sr-only'>{t('move list item up label')}</span> */}
      {/*  </Button> */}
      {/*  <Button compact rounding='rounded-be-md' disabled={isLast} onClick={onClickMoveDown}> */}
      {/*    <CaretDown /> */}
      {/*    <span className='sr-only'>{t('move list item down label')}</span> */}
      {/*  </Button> */}
      {/* </ButtonGroup> */}
      <Button onClick={onClickDelete} variant='ghost' spacing='p-1' className='self-stretch'>
        <Minus className={getSize(4)} />
        <span className='sr-only'>{t('delete list item label')}</span>
      </Button>
    </li>
  );
};

export const ListPrimitive = ({
  spaceKey,
  listId,
  onChangePeriod = 0,
  selectList,
  selectListItems,
  selectListItem,
  createListItem: naturalCreateListItem,
  updateList,
  updateListItem,
  deleteListItem,
  ...divProps
}: ListPrimitiveComponentProps) => {
  const { t } = useTranslation('appkit');

  const [creating, setCreating] = useState(false);
  const [autoFocus, setAutofocus] = useState<string | null>(null);

  const rejectTextUpdatesWhenFocused = useCallback(
    (a: string, b: string) => {
      return document.activeElement?.getAttribute('data-itemid') === listId ? true : a === b;
    },
    [listId]
  );

  // Selection

  const space = useSpace(spaceKey);
  const list = (useSelection<Item<ObjectModel>>(selectList(listId, space)) ?? [])[0];
  const listItems = useSelection<Item<ObjectModel>>(selectListItems(list)) ?? [];

  // Title

  const titleId = `${listId}__title`;
  const [title, setTitle, titleSession] = usePropStatefully(
    list?.model.get('title') ?? '',
    rejectTextUpdatesWhenFocused
  );
  const propagateTitle = useCallback(
    (nextValue: string) => {
      void updateList(list, { title: nextValue });
    },
    [updateList, list]
  );
  const debouncedPropagateTitle = useMemo(() => debounce(propagateTitle, onChangePeriod), [propagateTitle]);
  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      debouncedPropagateTitle(nextValue);
    },
    [debouncedPropagateTitle]
  );

  // Description

  const descriptionId = `${listId}__description`;
  const [description, setDescription, _descriptionSession] = usePropStatefully(
    list?.model.get('description') ?? '',
    rejectTextUpdatesWhenFocused
  );
  const propagateDescription = useCallback(
    (nextValue: string) => {
      void updateList(list, { description: nextValue });
    },
    [updateList, list]
  );
  const debouncedPropagateDescription = useMemo(
    () => debounce(propagateDescription, onChangePeriod),
    [propagateDescription]
  );
  const _onChangeDescription = useCallback(
    (nextValue: string) => {
      setDescription(nextValue);
      debouncedPropagateDescription(nextValue);
    },
    [debouncedPropagateDescription]
  );

  // Items & order

  const createListItem = useCallback(() => {
    setCreating(true);
    return naturalCreateListItem(listId, space)
      .then((item) => {
        item && setAutofocus(item.id);
      })
      .finally(() => setCreating(false));
  }, [naturalCreateListItem]);

  // Render

  return (
    <div
      role='group'
      {...divProps}
      className={cx(defaultGroup({ elevation: 3, spacing: 'pbs-2 pbe-1' }), divProps.className)}
      aria-labelledby={titleId}
      {...(description && { 'aria-describedby': descriptionId })}
    >
      <span id={titleId} className='sr-only'>
        {title}
      </span>
      {description && (
        <span id={descriptionId} className='sr-only'>
          {description}
        </span>
      )}
      <Input
        key={titleSession}
        label={t('list title label')}
        placeholder={t('list title placeholder')}
        labelVisuallyHidden
        initialValue={title}
        onChange={onChangeTitle}
        data-itemid={listId}
        spacing='mli-2 mbe-2'
        borders='border-0'
        rounding='rounded'
        typography='text-xl font-display font-semibold'
      />
      {/* TODO(thure): Re-enable this when relevant */}
      {/* <Input */}
      {/*  key={descriptionSession} */}
      {/*  label={t('list description label')} */}
      {/*  placeholder={t('list description placeholder')} */}
      {/*  labelVisuallyHidden */}
      {/*  initialValue={description} */}
      {/*  onChange={onChangeDescription} */}
      {/*  className='mli-4' */}
      {/*  data-itemid={listId} */}
      {/* /> */}
      <ol className='contents'>
        {listItems
          .filter((listItem) => !listItem?.model.get('annotations.deleted'))
          .map((listItem, index) => {
            return (
              <ListItemPrimitive
                key={listItem.id}
                {...{
                  autoFocus: listItem.id === autoFocus,
                  orderIndex: index,
                  isLast: index === listItems.length - 1,
                  listItemId: listItem.id,
                  selectListItem,
                  deleteListItem,
                  createListItem,
                  spaceKey,
                  onChangePeriod,
                  updateListItem
                }}
              />
            );
          })}
      </ol>
      <div role='none' className='mli-4 mlb-4'>
        <Button className='is-full' onClick={createListItem} disabled={creating}>
          <Plus className={getSize(5)} />
          <span className='sr-only'>{t('add list item label')}</span>
        </Button>
      </div>
    </div>
  );
};
