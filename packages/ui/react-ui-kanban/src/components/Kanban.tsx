//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { getSnapshot, getTypename, type JsonPath, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation, Tag } from '@dxos/react-ui';
import { useSelectionActions, useSelected, AttentionGlyph } from '@dxos/react-ui-attention';
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

const getColumnDropElement = (stackElement: HTMLDivElement) => {
  return stackElement.closest('.kanban-drop') as HTMLDivElement;
};

const kanbanCardStyles =
  'rounded overflow-hidden bg-cardSurface border border-separator dark:border-subduedSeparator dx-focus-ring-group-y-indicator relative min-bs-[--rail-item]';

export const Kanban = ({ model, onAddCard, onRemoveCard }: KanbanProps) => {
  const { t } = useTranslation(translationKey);
  const { singleSelect, clear } = useSelectionActions([model.id, getTypename(model.schema)!]);
  const selected = useSelected(model.id, 'single');
  const [_focusedCardId, setFocusedCardId] = useState<string | undefined>(undefined);
  useEffect(() => () => clear(), []);

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
      {model.arrangedCards.map(({ columnValue, cards }, index, array) => {
        const { color, title } = model.getPivotAttributes(columnValue);
        const uncategorized = columnValue === UNCATEGORIZED_VALUE;
        const prevSiblingId = index > 0 ? array[index - 1].columnValue : undefined;
        const nextSiblingId = index < array.length - 1 ? array[index + 1].columnValue : undefined;
        return (
          <StackItem.Root
            key={columnValue}
            item={{ id: columnValue }}
            size={20}
            classNames='flex flex-col pli-2 plb-2'
            disableRearrange={uncategorized}
            focusIndicatorVariant='group'
            prevSiblingId={prevSiblingId}
            nextSiblingId={nextSiblingId}
          >
            <div
              role='none'
              className={mx(
                'shrink min-bs-0 bg-baseSurface border border-separator rounded-md grid dx-focus-ring-group-x-indicator kanban-drop',
                railGridHorizontalContainFitContent,
              )}
              data-scroll-separator='false'
            >
              <Stack
                id={columnValue}
                orientation='vertical'
                size='contain'
                rail={false}
                classNames={
                  /* NOTE(thure): Do not let this element have zero intrinsic size, otherwise the drop indicator will not display. See #9035. */
                  ['plb-1', cards.length > 0 && 'plb-2']
                }
                onRearrange={model.handleRearrange}
                itemsCount={cards.length}
                getDropElement={getColumnDropElement}
                separatorOnScroll={8}
              >
                {cards.map((card, cardIndex, cardsArray) => (
                  <StackItem.Root
                    key={card.id}
                    item={card}
                    classNames='contain-layout pli-2 plb-1 first-of-type:pbs-0 last-of-type:pbe-0'
                    focusIndicatorVariant='group'
                    onClick={() => singleSelect(card.id)}
                    prevSiblingId={cardIndex > 0 ? cardsArray[cardIndex - 1].id : undefined}
                    nextSiblingId={cardIndex < cardsArray.length - 1 ? cardsArray[cardIndex + 1].id : undefined}
                  >
                    <div role='none' className={kanbanCardStyles}>
                      <div role='none' className='flex items-center absolute block-start-0 inset-inline-0'>
                        <StackItem.DragHandle asChild>
                          <IconButton
                            iconOnly
                            icon='ph--dots-six-vertical--regular'
                            variant='ghost'
                            label={t('card drag handle label')}
                            classNames='pli-2'
                          />
                        </StackItem.DragHandle>
                        <AttentionGlyph attended={selected === card.id} />
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
                      <Surface role='card--kanban' limit={1} data={{ subject: card }} />
                    </div>
                    <StackItem.DragPreview>
                      {({ item }) => (
                        <div className='p-2'>
                          <div className={mx(kanbanCardStyles, 'ring-focusLine ring-neutralFocusIndicator')}>
                            <div role='none' className='flex items-center absolute block-start-0 inset-inline-0'>
                              <IconButton
                                iconOnly
                                icon='ph--dots-six-vertical--regular'
                                variant='ghost'
                                label={t('card drag handle label')}
                                classNames='pli-2'
                              />
                            </div>
                            <Surface role='card--kanban' limit={1} data={{ subject: item }} />
                          </div>
                        </div>
                      )}
                    </StackItem.DragPreview>
                  </StackItem.Root>
                ))}
              </Stack>

              {onAddCard && (
                <div
                  role='none'
                  className='plb-2 pli-2 relative before:absolute before:inset-inline-2 before:block-start-0 before:bs-px before:bg-subduedSeparator'
                >
                  <IconButton
                    icon='ph--plus--regular'
                    label={t('add card label')}
                    onClick={() => handleAddCard(columnValue)}
                    classNames='is-full'
                  />
                </div>
              )}

              <StackItem.Heading classNames='mli-2 order-first bg-transparent rounded-bs-md'>
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
            <StackItem.DragPreview>
              {({ item }) => {
                // Find the column data for this item
                const columnData = model.arrangedCards.find((col) => col.columnValue === item.id);
                if (!columnData) {
                  return null;
                }

                const { cards, columnValue } = columnData;
                const { color, title } = model.getPivotAttributes(columnValue);
                const uncategorized = columnValue === UNCATEGORIZED_VALUE;

                return (
                  <div className='p-2'>
                    <div className='rounded-md max-bs-[calc(100dvh-1rem)] overflow-hidden bg-baseSurface border border-separator ring-focusLine ring-neutralFocusIndicator flex flex-col'>
                      {/* Column Header */}
                      <div className='flex items-center p-2'>
                        <IconButton
                          iconOnly
                          icon='ph--dots-six-vertical--regular'
                          variant='ghost'
                          label={t('column drag handle label')}
                          classNames='pli-2'
                        />
                        <Tag
                          palette={color as any}
                          data-uncategorized={uncategorized}
                          classNames='mis-1 data-[uncategorized="true"]:mis-2'
                        >
                          {title}
                        </Tag>
                      </div>

                      {/* Cards Container */}
                      <div
                        className={mx(
                          'overflow-y-auto flex-1 pli-2 flex flex-col gap-2',
                          'plb-1',
                          cards.length > 0 && 'plb-2',
                        )}
                      >
                        {cards.map((card) => (
                          <div key={card.id} role='none' className={kanbanCardStyles}>
                            <Surface role='card--kanban' limit={1} data={{ subject: card }} />
                          </div>
                        ))}
                      </div>

                      {/* Add Card Button */}
                      {onAddCard && (
                        <div className='p-2 border-t border-separator'>
                          <IconButton icon='ph--plus--regular' label={t('add card label')} classNames='is-full' />
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            </StackItem.DragPreview>
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

type CardFormProps<T extends BaseKanbanItem> = {
  card: T;
  model: KanbanModel;
  autoFocus: boolean;
};

const _CardForm = <T extends BaseKanbanItem>({ card, model, autoFocus }: CardFormProps<T>) => {
  const handleSave = useCallback(
    debounce((values: any, { changed }: { changed: Record<JsonPath, boolean> }) => {
      const id = values.id;
      invariant(typeof id === 'string');
      const object = model.items.find((obj) => obj.id === id);
      invariant(object);

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      for (const path of changedPaths) {
        const value = values[path];
        setValue(object, path, value);
      }
    }, 500),
    [model.items],
  );

  const initialValue = useMemo(() => getSnapshot(card), [JSON.stringify(card)]); // TODO(burdon): Avoid stringify.

  // TODO(ZaymonFC): This is a bit of an abuse of Custom. Should we have a first class way to
  //   omit fields from the form?
  const Custom: ComponentProps<typeof Form>['Custom'] = useMemo(() => {
    if (!model.columnFieldPath) {
      return undefined;
    }

    const custom: ComponentProps<typeof Form>['Custom'] = {};
    custom[model.columnFieldPath] = () => <></>;
    for (const field of model.kanban.cardView?.target?.hiddenFields ?? []) {
      custom[field.path] = () => <></>;
    }

    return custom;
  }, [model.columnFieldPath, JSON.stringify(model.kanban.cardView?.target?.hiddenFields)]);

  return (
    <Form
      values={initialValue}
      schema={model.schema}
      Custom={Custom}
      onSave={handleSave}
      autoFocus={autoFocus}
      autoSave
    />
  );
};
