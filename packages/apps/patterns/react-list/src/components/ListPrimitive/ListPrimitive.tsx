//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { CaretUp, CaretDown } from 'phosphor-react';
import React, { ComponentProps, useCallback, useState } from 'react';

import { ButtonGroup, defaultGroup, defaultHover } from '@dxos/react-ui';
import { defaultFocus, Input, useTranslation, getSize, Button } from '@dxos/react-uikit';

type ListId = string;
type ListItemId = string;

export interface ListItemProps {
  id: ListItemId;
  title: string;
  description?: string;
  annotations?: Record<string, string | boolean>;
}

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

export type ListAction = ListItemChangedAction | ListChangedAction;

export interface ListPrimitiveProps {
  id: ListId;
  title?: string;
  description?: string;
  items: Record<ListItemId, Omit<ListItemProps, 'id'>>;
  order: ListItemId[];
}

export interface ListPrimitiveComponentProps extends ListPrimitiveProps, Omit<ComponentProps<'div'>, 'id'> {
  onAction?: (action: ListAction) => void;
}

export interface ListItemPrimitiveComponentProps extends ListItemProps, Omit<ComponentProps<'li'>, 'id' | 'title'> {
  updateItem: (item: ListItemProps) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const ListItemPrimitive = ({
  id,
  title: propsTitle,
  description: propsDescription,
  annotations,
  updateItem,
  isFirst,
  isLast
}: ListItemPrimitiveComponentProps) => {
  const isDone = annotations?.state === 'done';
  const checkId = `${id}__checkbox`;
  const labelId = `${id}__title`;
  const descriptionId = `${id}__description`;

  const { t } = useTranslation('appkit');

  const [title, setTitle] = useState(propsTitle ?? '');
  const [description, setDescription] = useState(propsDescription ?? '');

  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      updateItem({
        id,
        title: nextValue,
        description,
        annotations
      });
    },
    [id, title, description, annotations]
  );

  const onChangeDescription = useCallback(
    (nextValue: string) => {
      setDescription(nextValue);
      updateItem({
        id,
        title,
        description: nextValue,
        annotations
      });
    },
    [id, title, description, annotations]
  );

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
          ...(isDone && {
            checked: true
          }),
          ...(description && {
            'aria-describedby': descriptionId
          }),
          className: cx(
            getSize(4),
            'text-primary-600 bg-neutral-50 rounded border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 cursor-pointer',
            defaultFocus,
            defaultHover({})
          )
        }}
        id={checkId}
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
        <Input
          label={t('list item description label')}
          placeholder={t('list item description placeholder')}
          labelVisuallyHidden
          initialValue={description}
          onChange={onChangeDescription}
        />
      </div>
      <ButtonGroup className='flex flex-col items-stretch'>
        <Button compact rounding='rounded-bs-md border-be-0' disabled={isFirst}>
          <CaretUp />
          <span className='sr-only'>{t('move list item up label')}</span>
        </Button>
        <Button compact rounding='rounded-be-md' disabled={isLast}>
          <CaretDown />
          <span className='sr-only'>{t('move list item down label')}</span>
        </Button>
      </ButtonGroup>
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
  ...divProps
}: ListPrimitiveComponentProps) => {
  const { t } = useTranslation('appkit');

  const [title, setTitle] = useState(propsTitle ?? '');
  const [description, setDescription] = useState(propsDescription ?? '');

  const [order, setOrder] = useState(propsOrder ?? []);
  const [items, setItems] = useState(propsItems ?? {});

  const titleId = `${listId}__title`;
  const descriptionId = `${listId}__description`;

  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      onAction?.({ listId, next: { title: nextValue } });
    },
    [onAction, listId]
  );

  const onChangeDescription = useCallback(
    (nextValue: string) => {
      setDescription(nextValue);
      onAction?.({ listId, next: { description: nextValue } });
    },
    [onAction, listId]
  );

  const updateItem = useCallback(({ id, ...item }: ListItemProps) => {
    setItems(Object.assign(items, { id: item }));
    onAction?.({ listId, listItemId: id, next: item });
  }, []);

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
      <Input
        label={t('list description label')}
        placeholder={t('list description placeholder')}
        labelVisuallyHidden
        initialValue={description}
        onChange={onChangeDescription}
        className='mli-4'
      />
      <ol className='contents'>
        {order.map((listItemId, index) => {
          return (
            <ListItemPrimitive
              key={listItemId}
              isFirst={index === 0}
              isLast={index === order.length - 1}
              {...{ id: listItemId, updateItem }}
              {...items[listItemId]}
            />
          );
        })}
      </ol>
    </div>
  );
};
