//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { type KanbanModel } from '../defs';
import { translationKey } from '../translations';

export type KanbanProps = {
  model: KanbanModel;
  columns: Record<string, { label: string }>;
};

export const Kanban = ({ model, columns }: KanbanProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Stack orientation='horizontal' size='contain'>
      {Object.entries(model.arrangement).map(([columnId, items]) => (
        <StackItem.Root
          key={columnId}
          item={{ id: columnId }}
          classNames='border-ie border-separator'
          onRearrange={model.onRearrange}
        >
          <StackItem.Heading classNames='border-be border-separator'>
            <StackItem.DragHandle asChild>
              <IconButton icon='ph--dots-six-vertical' variant='ghost' label={t('column drag handle label')} />
            </StackItem.DragHandle>
            <h2>{columns[columnId].label}</h2>
          </StackItem.Heading>
          <Stack orientation='vertical' size='contain' rail={false}>
            {items.map((item) => (
              <StackItem.Root
                key={item.id}
                item={item}
                classNames='border-be border-separator'
                onRearrange={model.onRearrange}
              >
                <StackItem.DragHandle asChild>
                  <IconButton icon='ph--dots-six' variant='ghost' label={t('card drag handle label')} />
                </StackItem.DragHandle>
                <Form readonly values={item} schema={model.cardSchema} />
              </StackItem.Root>
            ))}
          </Stack>
        </StackItem.Root>
      ))}
    </Stack>
  );
};
