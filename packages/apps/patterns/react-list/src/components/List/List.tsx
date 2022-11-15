//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, useCallback, useState } from 'react';

import { Group, Input, useTranslation } from '@dxos/react-uikit';

type ListId = string;
type ListItemId = string;

export type ListItemAnnotation = Record<string, string | boolean>;

export interface ListItemProps {
  id: ListItemId;
  title: string;
  annotations: ListItemAnnotation[];
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
  next: Partial<ListProps>;
}

export type ListAction = ListItemChangedAction | ListChangedAction;

export interface ListProps extends ComponentProps<'div'> {
  id: ListId;
  title?: string;
  description?: string;
  items: Record<ListItemId, Omit<ListItemProps, 'id'>>;
  order: ListItemId[];
  onAction?: (action: ListAction) => void;
}

export const List = ({
  id,
  title: propsTitle,
  description: propsDescription,
  items: propsItems,
  order: propsOrder,
  onAction,
  ...divProps
}: ListProps) => {
  const { t } = useTranslation('appkit');

  const [title, setTitle] = useState(propsTitle ?? '');
  const [description, setDescription] = useState(propsDescription ?? '');

  const onChangeTitle = useCallback(
    (nextValue: string) => {
      setTitle(nextValue);
      onAction?.({ listId: id, next: { title: nextValue } });
    },
    [onAction, id]
  );

  const onChangeDescription = useCallback(
    (nextValue: string) => {
      setDescription(nextValue);
      onAction?.({ listId: id, next: { description: nextValue } });
    },
    [onAction, id]
  );

  return (
    <Group label={{ children: title }} labelVisuallyHidden {...divProps}>
      <Input
        label={t('list title label')}
        placeholder={t('list title placeholder')}
        labelVisuallyHidden
        initialValue={title}
        onChange={onChangeTitle}
      />
      <Input
        label={t('list description label')}
        placeholder={t('list description placeholder')}
        labelVisuallyHidden
        initialValue={description}
        onChange={onChangeDescription}
      />
    </Group>
  );
};
