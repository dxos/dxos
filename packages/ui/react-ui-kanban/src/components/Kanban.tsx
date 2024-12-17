//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { IconButton, useTranslation, Input } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Stack, StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { type BaseKanbanItem, type KanbanModel } from '../defs';
import { translationKey } from '../translations';

export type KanbanProps<T extends BaseKanbanItem = { id: string }> = {
  model: KanbanModel;
  onAddColumn?: (columnValue: string) => void;
  onAddCard?: (columnValue: string) => void;
  onRemoveCard?: (card: T) => void;
  onRemoveEmptyColumn?: (columnValue: string) => void;
};

export const Kanban = ({ model, onAddColumn, onAddCard, onRemoveCard, onRemoveEmptyColumn }: KanbanProps) => {
  const { t } = useTranslation(translationKey);
  const [namingColumn, setNamingColumn] = useState(false);

  return (
    <Stack orientation='horizontal' size='contain' rail={false} classNames='pli-1'>
      {model.arrangement.map(({ columnValue, cards }) => (
        <StackItem.Root
          key={columnValue}
          item={{ id: columnValue }}
          onRearrange={model.onRearrange}
          size={20}
          classNames='pli-1 plb-2'
        >
          <div role='none' className={mx('bg-deck rounded-lg grid', railGridHorizontal)}>
            <StackItem.Heading>
              <StackItem.DragHandle asChild>
                <IconButton
                  iconOnly
                  icon='ph--dots-six-vertical'
                  variant='ghost'
                  label={t('column drag handle label')}
                />
              </StackItem.DragHandle>
              <h2>{columnValue}</h2>
              {onRemoveEmptyColumn && cards.length < 1 && (
                <IconButton
                  iconOnly
                  icon='ph--x--regular'
                  label={t('remove empty column label')}
                  onClick={() => onRemoveEmptyColumn(columnValue)}
                />
              )}
            </StackItem.Heading>
            <Stack orientation='vertical' size='contain' rail={false} classNames='pbe-1'>
              {cards.map((card) => (
                <StackItem.Root key={card.id} item={card} onRearrange={model.onRearrange} classNames='plb-1 pli-2'>
                  <div role='none' className='rounded bg-[--surface-bg]'>
                    <StackItem.DragHandle asChild>
                      <IconButton iconOnly icon='ph--dots-six' variant='ghost' label={t('card drag handle label')} />
                    </StackItem.DragHandle>
                    {onRemoveCard && (
                      <IconButton
                        iconOnly
                        icon='ph--x--regular'
                        label={t('remove card label')}
                        onClick={() => onRemoveCard(card)}
                      />
                    )}
                    <Form readonly values={card} schema={model.cardSchema} />
                  </div>
                </StackItem.Root>
              ))}
              {onAddCard && (
                <IconButton
                  icon='ph--plus--regular'
                  label={t('add card label')}
                  onClick={() => onAddCard(columnValue)}
                />
              )}
            </Stack>
          </div>
        </StackItem.Root>
      ))}
      {onAddColumn && (
        <StackItem.Root
          item={{ id: 'new-column-cta' }}
          onRearrange={model.onRearrange}
          size={20}
          classNames='pli-1 plb-2'
        >
          <StackItem.Heading>
            {namingColumn ? (
              <Input.Root>
                <Input.Label srOnly>{t('new column name label')}</Input.Label>
                <Input.TextInput
                  autoFocus
                  placeholder={t('new column name label')}
                  onBlur={() => setNamingColumn(false)}
                  onKeyDown={(event) => {
                    switch (event.key) {
                      case 'Enter':
                        onAddColumn((event.target as HTMLInputElement).value);
                      // eslint-disable-next-line no-fallthrough
                      case 'Escape':
                        return setNamingColumn(false);
                    }
                  }}
                />
              </Input.Root>
            ) : (
              <IconButton
                icon='ph--plus--regular'
                label={t('add column label')}
                onClick={() => setNamingColumn(true)}
              />
            )}
          </StackItem.Heading>
        </StackItem.Root>
      )}
    </Stack>
  );
};
