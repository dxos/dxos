//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Minus, Plus } from 'phosphor-react';
import React, { ComponentProps, useCallback, useState } from 'react';

import { defaultGroup, defaultHover } from '@dxos/react-ui';
import { defaultFocus, Input, useTranslation, getSize, Button, randomString } from '@dxos/react-uikit';

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

export interface ListItemCreatedAction extends ListChangedAction {
  created: Partial<ListItemProps>;
}

export interface ListItemDeletedAction extends ListChangedAction {
  deleted: Partial<ListItemProps>;
}

export type ListAction = ListItemChangedAction | ListChangedAction | ListItemCreatedAction | ListItemDeletedAction;

export const isListItemChangedAction = (o: any): o is ListItemChangedAction => 'listItemId' in o;
export const isListItemCreatedAction = (o: any): o is ListItemCreatedAction => 'created' in o;
export const isListItemDeletedAction = (o: any): o is ListItemDeletedAction => 'deleted' in o;

export interface ListPrimitiveProps {
  id: ListId;
  title?: string;
  description?: string;
  items: ListItems;
  order: ListItemId[];
}

export interface ListPrimitiveComponentProps extends ListPrimitiveProps, Omit<ComponentProps<'div'>, 'id'> {
  onAction?: (action: ListAction) => void;
  createListItemId?: () => Promise<ListItemId>;
}

export interface ListItemPrimitiveComponentProps extends ListItemProps, Omit<ComponentProps<'li'>, 'id' | 'title'> {
  updateItem: (item: ListItemProps) => void;
  updateOrder: (id: ListItemId, delta: number) => void;
  deleteItem: (id: ListItemId) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const defaultCreateListItemId = async () => randomString(8);

const ListItemPrimitive = ({
  id,
  title: propsTitle,
  description: propsDescription,
  annotations: propsAnnotations,
  updateItem,
  deleteItem,
  updateOrder,
  isFirst,
  isLast
}: ListItemPrimitiveComponentProps) => {
  const checkId = `${id}__checkbox`;
  const labelId = `${id}__title`;
  const descriptionId = `${id}__description`;

  const { t } = useTranslation('appkit');

  const [title, setTitle] = useState(propsTitle ?? '');

  const [description, _setDescription] = useState(propsDescription ?? '');
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

  return (
    <li
      key={id}
      className='flex items-center gap-2 pli-4'
      aria-labelledby={labelId}
      {...(description && { 'aria-describedby': descriptionId })}
    >
      <input
        {...{
          type: 'checkbox',
          id: checkId,
          ...(description && {
            'aria-describedby': descriptionId
          }),
          className: cx(
            getSize(4),
            'text-primary-600 bg-neutral-50 rounded border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 cursor-pointer',
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
          label={t('list item title label')}
          placeholder={t('list item title placeholder')}
          labelVisuallyHidden
          initialValue={title}
          onChange={onChangeTitle}
        />
        {/* TODO(thure): Re-enable this when descriptions become relevant */}
        {/* <Input */}
        {/*  label={t('list item description label')} */}
        {/*  placeholder={t('list item description placeholder')} */}
        {/*  labelVisuallyHidden */}
        {/*  initialValue={description} */}
        {/*  onChange={onChangeDescription} */}
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
      <Button compact onClick={onClickDelete}>
        <Minus />
        <span className='sr-only'>{t('delete list item label')}</span>
      </Button>
    </li>
  );
};

export const ListPrimitive = ({
  id: listId,
  title: propsTitle,
  description: propsDescription,
  items: propsItems,
  order: propsOrder,
  onAction,
  createListItemId = defaultCreateListItemId,
  ...divProps
}: ListPrimitiveComponentProps) => {
  const { t } = useTranslation('appkit');

  const [title, setTitle] = useState(propsTitle ?? '');
  const [description, setDescription] = useState(propsDescription ?? '');

  const [order, setOrder] = useState(propsOrder ?? []);
  const [items, setItems] = useState(propsItems ?? {});

  const [creating, setCreating] = useState(false);

  const titleId = `${listId}__title`;
  const descriptionId = `${listId}__description`;

  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      onAction?.({ listId, next: { title: nextValue } });
    },
    [onAction, listId]
  );

  const _onChangeDescription = useCallback(
    (nextValue: string) => {
      setDescription(nextValue);
      onAction?.({ listId, next: { description: nextValue } });
    },
    [onAction, listId]
  );

  const updateItem = useCallback(
    ({ id, ...next }: Pick<ListItemProps, 'id'> & Partial<Omit<ListItemProps, 'id'>>) => {
      setItems(Object.assign(items, { [id]: { ...items[id], ...next } }));
      onAction?.({ listId, listItemId: id, next });
    },
    [items, onAction]
  );

  const updateOrder = useCallback(
    (id: ListItemId, delta: number) => {
      const fromIndex = order.indexOf(id);
      const toIndex = fromIndex + delta;
      const nextOrder = Array.from(order);
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, id);
      setOrder(nextOrder);
      onAction?.({ listId, next: { order: nextOrder } });
    },
    [order, onAction]
  );

  const deleteItem = useCallback(
    (id: ListItemId) => {
      const next: Partial<ListPrimitiveProps> = {};
      const fromIndex = order.indexOf(id);
      if (fromIndex >= 0) {
        const nextOrder = Array.from(order);
        nextOrder.splice(fromIndex, 1);
        setOrder(nextOrder);
        next.order = nextOrder;
      }
      if (items[id]) {
        const { [id]: _removedItem, ...nextItems } = items;
        setItems(nextItems);
        next.items = nextItems;
      }
      onAction?.({ listId, next });
    },
    [order, items, onAction]
  );

  const createItem = useCallback(() => {
    setCreating(true);
    return createListItemId()
      .then((id) => {
        const next = {
          items: { ...items, [id]: {} },
          order: [...order, id]
        };
        const created = { id };
        setItems(next.items);
        setOrder(next.order);
        onAction?.({ listId, next, created });
      })
      .finally(() => setCreating(false));
  }, [order, items, createListItemId, onAction]);

  return (
    <div
      role='group'
      {...divProps}
      className={cx(defaultGroup({ elevation: 3, spacing: '' }), 'plb-2', divProps.className)}
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
        label={t('list title label')}
        placeholder={t('list title placeholder')}
        labelVisuallyHidden
        initialValue={title}
        onChange={onChangeTitle}
        className='mli-4'
      />
      {/* TODO(thure): Re-enable this when relevant */}
      {/* <Input */}
      {/*  label={t('list description label')} */}
      {/*  placeholder={t('list description placeholder')} */}
      {/*  labelVisuallyHidden */}
      {/*  initialValue={description} */}
      {/*  onChange={onChangeDescription} */}
      {/*  className='mli-4' */}
      {/* /> */}
      <ol className='contents'>
        {order.map((listItemId, index) => {
          return (
            <ListItemPrimitive
              key={listItemId}
              isFirst={index === 0}
              isLast={index === order.length - 1}
              {...{ id: listItemId, updateItem, updateOrder, deleteItem }}
              {...items[listItemId]}
            />
          );
        })}
      </ol>
      <div role='none' className='mli-4 mlb-4'>
        <Button className='is-full' onClick={createItem} disabled={creating}>
          <Plus />
          <span className='sr-only'>{t('add list item label')}</span>
        </Button>
      </div>
    </div>
  );
};
