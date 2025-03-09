//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';

import { type JsonPath, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation, Tag } from '@dxos/react-ui';
import { useSelectionActions, useSelectedItems, AttentionGlyph } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { Stack, StackItem, autoScrollRootAttributes, railGridHorizontalContainFitContent } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { UNCATEGORIZED_VALUE, type BaseKanbanItem, type KanbanModel } from '../defs';
import { translationKey } from '../translations';

export type KanbanProps<T extends BaseKanbanItem = { id: string }> = {
  model: KanbanModel;
  onAddCard?: (columnValue: string | undefined) => string | undefined;
  onRemoveCard?: (card: T) => void;
};

export const Kanban = ({ model, onAddCard, onRemoveCard }: KanbanProps) => {
  const { t } = useTranslation(translationKey);
  const { select, clear } = useSelectionActions([model.id, model.cardSchema.typename]);
  const selectedItems = useSelectedItems(model.id);
  const [focusedCardId, setFocusedCardId] = useState<string | undefined>(undefined);
  useEffect(() => () => clear(), []);

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

  const handleSave = useCallback(
    (values: any, { changed }: { changed: Record<JsonPath, boolean> }) => {
      const id = values.id;
      invariant(typeof id === 'string');
      const object = model.items.find((obj) => obj.id === id);
      invariant(object);

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      for (const path of changedPaths) {
        const value = values[path];
        setValue(object, path, value);
      }
    },
    [model.items],
  );

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      if (onAddCard) {
        const newCardId = onAddCard(columnValue === UNCATEGORIZED_VALUE ? undefined : columnValue);
        setFocusedCardId(newCardId);
      }
    },
    [onAddCard],
  );

  return (
    <Stack
      orientation='horizontal'
      size='contain'
      rail={false}
      classNames='pli-1'
      onRearrange={model.handleRearrange}
      itemsCount={model.arrangedCards.length}
      {...autoScrollRootAttributes}
    >
      {model.arrangedCards.map(({ columnValue, cards }) => {
        const { color, title } = model.getPivotAttributes(columnValue);
        const uncategorized = columnValue === UNCATEGORIZED_VALUE;
        return (
          <StackItem.Root
            key={columnValue}
            item={{ id: columnValue }}
            size={20}
            classNames='flex flex-col pli-1 plb-2 drag-preview-p-0'
            disableRearrange={uncategorized}
            focusIndicatorVariant='group'
          >
            <div
              role='none'
              className={mx(
                'shrink min-bs-0 bg-groupSurface rounded-lg grid dx-focus-ring-group-x-indicator',
                railGridHorizontalContainFitContent,
              )}
            >
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
                  <StackItem.Root
                    key={card.id}
                    item={card}
                    classNames={'contain-layout plb-1 pli-2 drag-preview-p-0'}
                    focusIndicatorVariant='group'
                    onClick={() => select([card.id])}
                  >
                    <div
                      role='none'
                      className={mx(
                        'rounded bg-baseSurface dx-focus-ring-group-y-indicator',
                        selectedItems.has(card.id) && 'dx-focus-ring',
                      )}
                    >
                      <div role='none' className='flex items-center'>
                        <StackItem.DragHandle asChild>
                          <IconButton
                            iconOnly
                            icon='ph--dots-six-vertical--regular'
                            variant='ghost'
                            label={t('card drag handle label')}
                          />
                        </StackItem.DragHandle>
                        <AttentionGlyph attended={selectedItems.has(card.id)} />
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
                      <Form
                        values={card}
                        schema={model.cardSchema}
                        Custom={Custom}
                        onSave={handleSave}
                        autoFocus={card.id === focusedCardId}
                        autoSave
                      />
                    </div>
                  </StackItem.Root>
                ))}
              </Stack>
              {onAddCard && (
                <div role='none' className='plb-2 pli-2'>
                  <IconButton
                    icon='ph--plus--regular'
                    label={t('add card label')}
                    onClick={() => handleAddCard(columnValue)}
                    classNames='is-full bg-baseSurface'
                  />
                </div>
              )}
              <StackItem.Heading classNames='pli-2 order-first'>
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
