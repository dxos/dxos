//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Form } from '@dxos/react-ui-form';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { type KanbanModel } from '../defs';

export type KanbanProps = {
  model: KanbanModel;
  columns: Record<string, { label: string }>;
};

export const Kanban = ({ model, columns }: KanbanProps) => {
  const itemsByColumn = model.itemsByColumn();
  return (
    <Stack orientation='horizontal' size='contain'>
      {Object.entries(itemsByColumn).map(([columnId, items]) => (
        <StackItem.Root key={columnId} item={{ id: columnId }}>
          <StackItem.Heading>
            <h2>{columns[columnId].label}</h2>
          </StackItem.Heading>
          <Stack orientation='vertical' size='contain' rail={false}>
            {items.map((item) => (
              <StackItem.Root key={item.id} item={item}>
                <Form readonly values={item} schema={model.cardSchema()} />
              </StackItem.Root>
            ))}
          </Stack>
        </StackItem.Root>
      ))}
    </Stack>
  );
};
