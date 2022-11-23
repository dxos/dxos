//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import debounce from 'lodash.debounce';
import { Minus, Plus } from 'phosphor-react';
import React, { ComponentProps, useCallback, useMemo, useState, KeyboardEvent } from 'react';

import {
  defaultFocus,
  Input,
  useTranslation,
  getSize,
  Button,
  randomString,
  defaultGroup,
  defaultHover
} from '@dxos/react-uikit';

import { usePropStatefully } from '../../hooks';

type ListId = string;
type ListItemId = string;

export interface ListItemProps {
  id: ListItemId;
  title?: string;
  description?: string;
  annotations?: Record<string, string | boolean>;
}

export type ListItems = Record<ListItemId, Omit<ListItemProps, 'id'>>;

interface SharedListActionProps {
  listId: ListId;
}

interface SharedListItemActionProps extends SharedListActionProps {
  listItemId: ListItemId;
}

export interface ListItemChangedAction extends SharedListItemActionProps {
  next: Partial<ListItemProps>;
}

export interface ListChangedAction extends SharedListActionProps {
  next: Partial<ListPrimitiveProps>;
}

export interface ListItemCreatedAction extends SharedListActionProps {
  created: Pick<ListItemProps, 'id'> & Partial<Omit<ListItemProps, 'id'>>;
}

export interface ListItemDeletedAction extends SharedListActionProps {
  deleted: Pick<ListItemProps, 'id'> & Partial<Omit<ListItemProps, 'id'>>;
}

export type ListAction = ListItemChangedAction | ListChangedAction | ListItemCreatedAction | ListItemDeletedAction;

export const isListItemChangedAction = (o: any): o is ListItemChangedAction => 'listItemId' in o;
export const isListItemCreatedAction = (o: any): o is ListItemCreatedAction => 'created' in o;
export const isListItemDeletedAction = (o: any): o is ListItemDeletedAction => 'deleted' in o;

export interface ListPrimitiveProps {
  id: ListId;
  title?: string;
  description?: string;
}

export interface ListPrimitiveComponentProps extends ListPrimitiveProps, Omit<ComponentProps<'div'>, 'id'> {
  items: ListItems;
  onAction?: (action: ListAction) => void;
  createListItemId?: () => Promise<ListItemId>;
  onChangePeriod?: number;
}

export interface ListItemPrimitiveComponentProps extends ListItemProps, Omit<ComponentProps<'li'>, 'id' | 'title'> {
  updateItem: (item: ListItemProps) => void;
  updateOrder: (id: ListItemId, delta: number) => void;
  deleteItem: (id: ListItemId) => void;
  createItem: () => void;
  orderIndex: number;
  isLast?: boolean;
  autoFocus?: boolean;
}

const defaultCreateListItemId = async () => randomString(8);

const ListItemPrimitive = ({
  id,
  title: propsTitle,
  description: propsDescription,
  annotations: propsAnnotations,
  updateItem,
  deleteItem,
  createItem,
  updateOrder,
  orderIndex,
  isLast,
  autoFocus
}: ListItemPrimitiveComponentProps) => {
  const checkId = `${id}__checkbox`;
  const labelId = `${id}__title`;
  const descriptionId = `${id}__description`;

  const { t } = useTranslation('appkit');

  const rejectTextUpdatesWhenFocused = useCallback(
    (a: string, b: string) => {
      return document.activeElement?.getAttribute('data-itemid') === id ? true : a === b;
    },
    [id]
  );

  const [title, setTitle, titleSession] = usePropStatefully<string>(propsTitle ?? '', rejectTextUpdatesWhenFocused);

  const [description, _setDescription, _descriptionSession] = usePropStatefully<string>(
    propsDescription ?? '',
    rejectTextUpdatesWhenFocused
  );

  const [annotations, setAnnotations] = useState(propsAnnotations ?? {});
  const isDone = annotations?.state === 'done';

  const onChangeTitle = useCallback((nextValue: string) => {
    setTitle(nextValue);
    updateItem({ id, title: nextValue });
  }, []);

  const _onChangeDescription = useCallback((nextValue: string) => {
    _setDescription(nextValue);
    updateItem({ id, description: nextValue });
  }, []);

  const _onClickMoveUp = useCallback(() => {
    updateOrder(id, -1);
  }, [updateOrder, id]);
  const _onClickMoveDown = useCallback(() => {
    updateOrder(id, 1);
  }, [updateOrder, id]);

  const onChangeCheckbox = useCallback(() => {
    const nextAnnotations = { ...annotations, state: isDone ? 'init' : 'done' };
    setAnnotations(nextAnnotations);
    updateItem({ id, annotations: nextAnnotations });
  }, [annotations, isDone]);

  const onClickDelete = useCallback(() => {
    deleteItem(id);
  }, [deleteItem, id]);

  const onKeyUp = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          if (!e.shiftKey) {
            if (isLast) {
              createItem();
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
      key={id}
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
          data-itemid={id}
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

const itemsEquivalent = (a: ListItems, b: ListItems) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (key !== bKeys[i] || a[key].title !== b[key].title || a[key].annotations?.state !== b[key].annotations?.state) {
      return false;
    }
  }
  return true;
};

export const ListPrimitive = ({
  id: listId,
  title: propsTitle,
  description: propsDescription,
  items: propsItems,
  onAction,
  createListItemId = defaultCreateListItemId,
  onChangePeriod = 0,
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

  // Title

  const titleId = `${listId}__title`;
  const [title, setTitle, titleSession] = usePropStatefully(propsTitle ?? '', rejectTextUpdatesWhenFocused);
  const propagateTitle = useCallback(
    (nextValue: string) => {
      return onAction?.({ listId, next: { title: nextValue } });
    },
    [onAction]
  );
  const debouncedPropagateTitle = useMemo(() => debounce(propagateTitle, onChangePeriod), [propagateTitle]);
  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      debouncedPropagateTitle(nextValue);
    },
    [onAction, listId]
  );

  // Description

  const descriptionId = `${listId}__description`;
  const [description, setDescription, _descriptionSession] = usePropStatefully(
    propsDescription ?? '',
    rejectTextUpdatesWhenFocused
  );
  const propagateDescription = useCallback(
    (nextValue: string) => onAction?.({ listId, next: { description: nextValue } }),
    [onAction]
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
    [onAction, listId]
  );

  // Items & order

  const [items, setItems, itemsSession] = usePropStatefully(propsItems ?? {}, itemsEquivalent);
  const order = Object.keys(items);

  const propagateItem = useCallback(
    ({ id, ...next }: Pick<ListItemProps, 'id'> & Partial<Omit<ListItemProps, 'id'>>) => {
      return onAction?.({ listId, listItemId: id, next });
    },
    [listId, onAction]
  );
  const debouncedPropagateItem = useMemo(() => debounce(propagateItem, onChangePeriod), [propagateItem]);
  const updateItem = useCallback(
    ({ id, ...next }: Pick<ListItemProps, 'id'> & Partial<Omit<ListItemProps, 'id'>>) => {
      setItems(Object.assign(items, { [id]: { ...items[id], ...next } }));
      'title' in next && debouncedPropagateItem({ id, title: next.title });
      'description' in next && debouncedPropagateItem({ id, description: next.description });
      'annotations' in next && onAction?.({ listId, listItemId: id, next: { annotations: next.annotations } });
    },
    [items, listId, onAction]
  );

  const updateOrder = useCallback(
    (id: ListItemId, delta: number) => {
      const fromIndex = order.indexOf(id);
      const toIndex = fromIndex + delta;
      const nextOrder = Array.from(order);
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, id);
      const nextItems = nextOrder.reduce((acc: ListItems, listItemId) => {
        acc[listItemId] = items[listItemId];
        return acc;
      }, {});
      setItems(nextItems);
      onAction?.({ listId, next: {} });
    },
    [items, onAction]
  );

  const deleteItem = useCallback(
    (id: ListItemId) => {
      if (items[id]) {
        const { [id]: deletedItem, ...nextItems } = items;
        setItems(nextItems);
        onAction?.({ listId, next: {}, deleted: { id, ...deletedItem } });
      }
    },
    [items, onAction]
  );

  const createItem = useCallback(() => {
    setCreating(true);
    return createListItemId()
      .then((id) => {
        const next = {
          items: { ...items, [id]: {} }
        };
        const created = { id };
        setItems(next.items);
        setAutofocus(id);
        onAction?.({ listId, next: {}, created });
      })
      .finally(() => setCreating(false));
  }, [items, createListItemId, onAction]);

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
        {order.map((listItemId, index) => {
          return (
            <ListItemPrimitive
              key={`${itemsSession}__${listItemId}`}
              orderIndex={index}
              isLast={index === order.length - 1}
              {...{ id: listItemId, updateItem, updateOrder, deleteItem, createItem }}
              {...items[listItemId]}
              autoFocus={listItemId === autoFocus}
            />
          );
        })}
      </ol>
      <div role='none' className='mli-4 mlb-4'>
        <Button className='is-full' onClick={createItem} disabled={creating}>
          <Plus className={getSize(5)} />
          <span className='sr-only'>{t('add list item label')}</span>
        </Button>
      </div>
    </div>
  );
};
