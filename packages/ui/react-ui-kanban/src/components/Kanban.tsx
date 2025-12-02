//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph, useSelected, useSelectionActions } from '@dxos/react-ui-attention';
import {
  Card,
  CardDragPreview,
  CardStack,
  CardStackDragPreview,
  Stack,
  StackItem,
  autoScrollRootAttributes,
  cardStackDefaultInlineSizeRem,
  cardStackHeading,
} from '@dxos/react-ui-stack';

import { type BaseKanbanItem, type KanbanModel, UNCATEGORIZED_VALUE } from '../model';
import { translationKey } from '../translations';

export type KanbanProps<T extends BaseKanbanItem = { id: string }> = {
  model: KanbanModel;
  onAddCard?: (columnValue: string | undefined) => string | undefined;
  onRemoveCard?: (card: T) => void;
};

export const Kanban = ({ model, onAddCard, onRemoveCard }: KanbanProps) => {
  const { t } = useTranslation(translationKey);
  const { multiSelect, clear } = useSelectionActions([model.id]);
  const selected = useSelected(model.id, 'multi');
  useEffect(() => () => clear(), []);

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => onAddCard?.(columnValue === UNCATEGORIZED_VALUE ? undefined : columnValue),
    [onAddCard],
  );

  return (
    <Stack
      orientation='horizontal'
      size='contain'
      rail={false}
      classNames='pli-1 density-fine'
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
          // TODO(burdon): Root should be headless and come after StackItem.Root.
          <CardStack.Root asChild key={columnValue}>
            <StackItem.Root
              item={{ id: columnValue }}
              size={cardStackDefaultInlineSizeRem}
              disableRearrange={uncategorized}
              focusIndicatorVariant='group'
              prevSiblingId={prevSiblingId}
              nextSiblingId={nextSiblingId}
            >
              <CardStack.Content footer classNames='kanban-drop border border-separator rounded-md'>
                <CardStack.Stack
                  id={columnValue}
                  itemsCount={cards.length}
                  getDropElement={getColumnDropElement}
                  onRearrange={model.handleRearrange}
                >
                  {/* TODO(burdon): Factor out Card to separate file. */}
                  {cards.map((card, cardIndex, cardsArray) => (
                    <CardStack.Item key={card.id} asChild>
                      {/* TODO(burdon): Why is this required? */}
                      <StackItem.Root
                        item={card}
                        focusIndicatorVariant='group-always'
                        prevSiblingId={cardIndex > 0 ? cardsArray[cardIndex - 1].id : undefined}
                        nextSiblingId={cardIndex < cardsArray.length - 1 ? cardsArray[cardIndex + 1].id : undefined}
                        onClick={() => multiSelect([card.id])}
                      >
                        <Card.StaticRoot>
                          <Card.Toolbar>
                            <StackItem.DragHandle asChild>
                              <Card.DragHandle toolbarItem />
                            </StackItem.DragHandle>
                            <AttentionGlyph attended={selected.includes(card.id)} />
                            {onRemoveCard && (
                              <>
                                <Card.ToolbarSeparator variant='gap' />
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
                          <Surface
                            role='card--intrinsic'
                            limit={1}
                            data={{
                              subject: card,
                              projection: model.projection,
                            }}
                          />
                        </Card.StaticRoot>
                        <StackItem.DragPreview>
                          {({ item }) => (
                            <CardDragPreview.Root>
                              <CardDragPreview.Content>
                                <Card.Toolbar>
                                  <Card.DragHandle toolbarItem />
                                </Card.Toolbar>
                                <Surface
                                  role='card--intrinsic'
                                  limit={1}
                                  data={{
                                    subject: item,
                                    projection: model.projection,
                                  }}
                                />
                              </CardDragPreview.Content>
                            </CardDragPreview.Root>
                          )}
                        </StackItem.DragPreview>
                      </StackItem.Root>
                    </CardStack.Item>
                  ))}
                </CardStack.Stack>

                {onAddCard && (
                  <CardStack.Footer>
                    <IconButton
                      icon='ph--plus--regular'
                      label={t('add card label')}
                      classNames='is-full'
                      onClick={() => handleAddCard(columnValue)}
                    />
                  </CardStack.Footer>
                )}

                <StackItem.Heading classNames={cardStackHeading} separateOnScroll>
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
                </StackItem.Heading>
              </CardStack.Content>
              <StackItem.DragPreview>
                {({ item }) => {
                  // Find the column data for this item.
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
                          <Card.StaticRoot key={card.id}>
                            <Surface
                              role='card--intrinsic'
                              limit={1}
                              data={{
                                subject: card,
                                projection: model.projection,
                              }}
                            />
                          </Card.StaticRoot>
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
          </CardStack.Root>
        );
      })}
    </Stack>
  );
};

const getColumnDropElement = (stackElement: HTMLDivElement) => {
  return stackElement.closest('.kanban-drop') as HTMLDivElement;
};
