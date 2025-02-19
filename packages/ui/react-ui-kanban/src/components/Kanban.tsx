//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, useMemo } from 'react';

import { IconButton, useTranslation, Tag } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Stack, StackItem, railGridHorizontal } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { UNCATEGORIZED_VALUE, type BaseKanbanItem, type KanbanModel } from '../defs';
import { translationKey } from '../translations';

export type KanbanProps<T extends BaseKanbanItem = { id: string }> = {
  model: KanbanModel;
  onAddCard?: (columnValue: string | undefined) => void;
  onRemoveCard?: (card: T) => void;
};

export const Kanban = ({ model, onAddCard, onRemoveCard }: KanbanProps) => {
  const { t } = useTranslation(translationKey);
  // const [namingColumn, setNamingColumn] = useState(false);

  // TODO(ZaymonFC): This is a bit of an abuse of Custom. Should we have a first class way to
  //   omit fields from the form?
  const Custom: ComponentProps<typeof Form>['Custom'] = useMemo(() => {
    if (!model.columnFieldPath) {
      return undefined;
    }
    return {
      [model.columnFieldPath]: () => <></>,
    };
  }, [model.columnFieldPath]);

  return (
    <Stack
      orientation='horizontal'
      size='contain'
      rail={false}
      classNames='pli-1'
      onRearrange={model.handleRearrange}
      itemsCount={model.arrangedCards.length}
    >
      {model.arrangedCards.map(({ columnValue, cards }) => {
        const { color, title } = model.getPivotAttributes(columnValue);
        const uncategorized = columnValue === UNCATEGORIZED_VALUE;
        return (
          <StackItem.Root
            key={columnValue}
            item={{ id: columnValue }}
            size={20}
            classNames='pli-1 plb-2 drag-preview-p-0'
            disableRearrange={uncategorized}
          >
            <div role='none' className={mx('bg-deck rounded-lg grid', railGridHorizontal)}>
              <StackItem.Heading classNames='pli-2'>
                {!uncategorized && (
                  <StackItem.DragHandle asChild>
                    <IconButton
                      iconOnly
                      icon='ph--dots-six-vertical--regular'
                      variant='ghost'
                      label={t('column drag handle label')}
                      classNames='pli-2'
                    />
                  </StackItem.DragHandle>
                )}
                <Tag
                  palette={color as any}
                  data-uncategorized={uncategorized}
                  classNames='mis-1 data-[uncategorized="true"]:mis-2'
                >
                  {title}
                </Tag>
                {/* NOTE(ZaymonFC): We're just going to manipulate status with the ViewEditor for now. */}
                {/* {onRemoveEmptyColumn && cards.length < 1 && (
                  <IconButton
                    iconOnly
                    variant='ghost'
                    icon='ph--x--regular'
                    label={t('remove empty column label')}
                    onClick={() => onRemoveEmptyColumn(columnValue)}
                  />
                )} */}
              </StackItem.Heading>
              <Stack
                id={columnValue}
                orientation='vertical'
                size='contain'
                rail={false}
                classNames='pbe-1 drag-preview-p-0'
                onRearrange={model.handleRearrange}
                itemsCount={cards.length}
              >
                {cards.map((card) => (
                  <StackItem.Root key={card.id} item={card} classNames='plb-1 pli-2 drag-preview-p-0'>
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
                      onClick={() => onAddCard(columnValue === UNCATEGORIZED_VALUE ? undefined : columnValue)}
                      classNames='is-full'
                    />
                  </div>
                )}
              </Stack>
            </div>
          </StackItem.Root>
        );
      })}
      {/* NOTE(ZaymonFC): We're just going to manipulate status with the ViewEditor for now. */}
      {/* {onAddColumn && (
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
                        onAddColumn?((event.target as HTMLInputElement).value);
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
      )} */}
    </Stack>
  );
};
