//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { getTypename } from '@dxos/echo-schema';
import { IconButton, useTranslation, Tag } from '@dxos/react-ui';
import { useSelectionActions, useSelected, AttentionGlyph } from '@dxos/react-ui-attention';
import {
  Stack,
  StackItem,
  autoScrollRootAttributes,
  CardStack,
  CardStackDragPreview,
  Card,
  CardDragPreview,
} from '@dxos/react-ui-stack';

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
        queueMicrotask(() => {
          const columnStack = document.getElementById(columnValue as string);
          if (columnStack) {
            const scrollEvent = new Event('scroll');
            columnStack.dispatchEvent(scrollEvent);
          }
        });
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
        const columnItem = useMemo(() => ({ id: columnValue }), [columnValue]);
        return (
          <StackItem.Root
            key={columnValue}
            item={columnItem}
            size={20}
            disableRearrange={uncategorized}
            focusIndicatorVariant='group'
            prevSiblingId={prevSiblingId}
            nextSiblingId={nextSiblingId}
          >
            <CardStack.Root>
              <CardStack.Stack
                id={columnValue}
                onRearrange={model.handleRearrange}
                itemsCount={cards.length}
                getDropElement={getColumnDropElement}
              >
                {cards.map((card, cardIndex, cardsArray) => (
                  <StackItem.Root
                    key={card.id}
                    item={card}
                    focusIndicatorVariant='group'
                    onClick={() => singleSelect(card.id)}
                    prevSiblingId={cardIndex > 0 ? cardsArray[cardIndex - 1].id : undefined}
                    nextSiblingId={cardIndex < cardsArray.length - 1 ? cardsArray[cardIndex + 1].id : undefined}
                    asChild
                  >
                    <Card.Root>
                      <Card.Content>
                        <Card.Toolbar>
                          <StackItem.DragHandle asChild>
                            <Card.DragHandle toolbarItem />
                          </StackItem.DragHandle>
                          <AttentionGlyph attended={selected === card.id} />
                          {onRemoveCard && (
                            <>
                              <Card.ToolbarSeparator />
                              <Card.ToolbarIconButton
                                iconOnly
                                variant='ghost'
                                icon='ph--x--regular'
                                label={t('remove card label')}
                                onClick={() => onRemoveCard(card)}
                              />
                            </>
                          )}
                        </Card.Toolbar>
                        <Surface role='card--kanban' limit={1} data={{ subject: card }} />
                      </Card.Content>
                    </Card.Root>
                    <StackItem.DragPreview>
                      {({ item }) => (
                        <CardDragPreview.Root>
                          <CardDragPreview.Content>
                            <Card.Toolbar>
                              <Card.DragHandle />
                            </Card.Toolbar>
                            <Surface role='card--kanban' limit={1} data={{ subject: item }} />
                          </CardDragPreview.Content>
                        </CardDragPreview.Root>
                      )}
                    </StackItem.DragPreview>
                  </StackItem.Root>
                ))}
              </CardStack.Stack>

              {onAddCard && (
                <CardStack.Footer>
                  <IconButton
                    icon='ph--plus--regular'
                    label={t('add card label')}
                    onClick={() => handleAddCard(columnValue)}
                    classNames='is-full'
                  />
                </CardStack.Footer>
              )}

              <StackItem.Heading asChild>
                <CardStack.Heading>
                  <StackItem.DragHandle asChild>
                    <CardStack.DragHandle />
                  </StackItem.DragHandle>
                  <Tag
                    palette={color as any}
                    data-uncategorized={uncategorized}
                    classNames='mis-1 data-[uncategorized="true"]:mis-2'
                  >
                    {title}
                  </Tag>
                </CardStack.Heading>
              </StackItem.Heading>
            </CardStack.Root>
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
                  <CardStackDragPreview.Root>
                    {/* Column Header */}
                    <CardStackDragPreview.Heading>
                      <Tag
                        palette={color as any}
                        data-uncategorized={uncategorized}
                        classNames='mis-1 data-[uncategorized="true"]:mis-2'
                      >
                        {title}
                      </Tag>
                    </CardStackDragPreview.Heading>

                    {/* Cards Container */}
                    <CardStackDragPreview.Content itemsCount={cards.length}>
                      {cards.map((card) => (
                        <Card.Content key={card.id}>
                          <Surface role='card--kanban' limit={1} data={{ subject: card }} />
                        </Card.Content>
                      ))}
                    </CardStackDragPreview.Content>

                    {/* Add Card Button */}
                    {onAddCard && (
                      <CardStackDragPreview.Footer>
                        <IconButton icon='ph--plus--regular' label={t('add card label')} classNames='is-full' />
                      </CardStackDragPreview.Footer>
                    )}
                  </CardStackDragPreview.Root>
                );
              }}
            </StackItem.DragPreview>
          </StackItem.Root>
        );
      })}
    </Stack>
  );
};
