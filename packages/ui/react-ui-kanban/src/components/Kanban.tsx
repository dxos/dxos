//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, useMemo, useState } from 'react';

import { IconButton, useTranslation, Input, Tag } from '@dxos/react-ui';
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

  // TODO(ZaymonFC): This is a bit of an abuse of Custom. Should we have a first class way to
  //   omit fields from the form?
  const Custom: ComponentProps<typeof Form>['Custom'] = useMemo(() => {
    if (!model.columnField) {
      return undefined;
    }
    return {
      [model.columnField]: () => <></>,
    };
  }, [model.columnField]);

  return (
    <Stack
      orientation='horizontal'
      size='contain'
      rail={false}
      classNames='pli-1'
      onRearrange={model.onRearrange}
      itemsCount={model.arrangement.length + (onAddColumn ? 1 : 0)}
    >
      {model.arrangement.map(({ columnValue, cards }) => (
        <StackItem.Root key={columnValue} item={{ id: columnValue }} size={20} classNames='pli-1 plb-2'>
          <div role='none' className={mx('bg-deck rounded-lg grid', railGridHorizontal)}>
            <StackItem.Heading>
              <StackItem.DragHandle asChild>
                <IconButton
                  iconOnly
                  icon='ph--dots-six-vertical--regular'
                  variant='ghost'
                  label={t('column drag handle label')}
                />
              </StackItem.DragHandle>
              <Tag className='flex-1'>{columnValue}</Tag>
              {onRemoveEmptyColumn && cards.length < 1 && (
                <IconButton
                  iconOnly
                  variant='ghost'
                  icon='ph--x--regular'
                  label={t('remove empty column label')}
                  onClick={() => onRemoveEmptyColumn(columnValue)}
                />
              )}
            </StackItem.Heading>
            <Stack
              id={columnValue}
              orientation='vertical'
              size='contain'
              rail={false}
              classNames='pbe-1'
              onRearrange={model.onRearrange}
              itemsCount={cards.length}
            >
              {cards.map((card) => (
                <StackItem.Root key={card.id} item={card} classNames='plb-1 pli-2'>
                  <div role='none' className='rounded bg-[--surface-bg]'>
                    <div role='none' className='flex items-center'>
                      <StackItem.DragHandle asChild>
                        <IconButton
                          iconOnly
                          icon='ph--dots-six-vertical--regular'
                          variant='ghost'
                          label={t('card drag handle label')}
                        />
                      </StackItem.DragHandle>
                      {onRemoveCard && (
                        <>
                          <span role='separator' className='grow' />
                          <IconButton
                            iconOnly
                            variant='ghost'
                            icon='ph--x--regular'
                            label={t('remove card label')}
                            onClick={() => onRemoveCard(card)}
                          />
                        </>
                      )}
                    </div>
                    <Form values={card} schema={model.cardSchema} Custom={Custom} readonly />
                  </div>
                </StackItem.Root>
              ))}
              {onAddCard && (
                <div role='none' className='plb-1 pli-2'>
                  <IconButton
                    icon='ph--plus--regular'
                    label={t('add card label')}
                    onClick={() => onAddCard(columnValue)}
                    classNames='is-full'
                  />
                </div>
              )}
            </Stack>
          </div>
        </StackItem.Root>
      ))}
      {onAddColumn && (
        <StackItem.Root item={{ id: 'new-column-cta' }} size={20} classNames='pli-1 plb-2'>
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
                classNames='is-full'
              />
            )}
          </StackItem.Heading>
        </StackItem.Root>
      )}
    </Stack>
  );
};
