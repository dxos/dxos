//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Stack, StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { type KanbanModel } from '../defs';
import { translationKey } from '../translations';

export type KanbanProps = {
  model: KanbanModel;
  onAddColumn?: () => void;
  onAddCard?: (columnValue: string) => void;
};

export const Kanban = ({ model, onAddColumn, onAddCard }: KanbanProps) => {
  const { t } = useTranslation(translationKey);

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
            </StackItem.Heading>
            <Stack orientation='vertical' size='contain' rail={false} classNames='pbe-1'>
              {cards.map((card) => (
                <StackItem.Root key={card.id} item={card} onRearrange={model.onRearrange} classNames='plb-1 pli-2'>
                  <div role='none' className='rounded bg-[--surface-bg]'>
                    <StackItem.DragHandle asChild>
                      <IconButton iconOnly icon='ph--dots-six' variant='ghost' label={t('card drag handle label')} />
                    </StackItem.DragHandle>
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
          <IconButton icon='ph--plus--regular' label={t('add column label')} onClick={onAddColumn} />
        </StackItem.Root>
      )}
    </Stack>
  );
};
