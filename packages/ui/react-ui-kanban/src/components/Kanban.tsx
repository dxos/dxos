//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { IconButton, Tag, useTranslation } from '@dxos/react-ui';
import { AttentionGlyph, type UseSelectionActions, useSelected, useSelectionActions } from '@dxos/react-ui-attention';
import { Card, CardDragPreview } from '@dxos/react-ui-mosaic';
import {
  CardStack,
  CardStackDragPreview,
  Stack,
  StackItem,
  type StackItemRootProps,
  autoScrollRootAttributes,
  cardStackDefaultInlineSizeRem,
  cardStackHeading,
} from '@dxos/react-ui-stack';
import { type ProjectionModel } from '@dxos/schema';

import { type BaseKanbanItem, type KanbanColumn, type KanbanModel, UNCATEGORIZED_VALUE } from '../model';
import { translationKey } from '../translations';

// TODO(burdon): Create Radix-style Kanban components.

export type KanbanProps<T extends BaseKanbanItem = BaseKanbanItem> = Pick<
  ColumnComponentProps<T>,
  'model' | 'onAddCard' | 'onRemoveCard'
>;

export const Kanban = <T extends BaseKanbanItem = BaseKanbanItem>({
  model,
  onAddCard,
  onRemoveCard,
}: KanbanProps<T>) => {
  const { multiSelect, clear } = useSelectionActions([model.id]);
  const selected = useSelected(model.id, 'multi');
  useEffect(() => () => clear(), []);

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => onAddCard?.(columnValue === UNCATEGORIZED_VALUE ? undefined : columnValue),
    [onAddCard],
  );

  // Subscribe to arranged cards atom for reactivity.
  const columns = useAtomValue(model.cards);

  return (
    <Stack
      orientation='horizontal'
      size='contain'
      rail={false}
      classNames='p-2 gap-4 density-fine'
      onRearrange={model.handleRearrange}
      itemsCount={columns.length}
      {...autoScrollRootAttributes}
    >
      {columns.map(({ columnValue, cards }, index, array) => {
        const uncategorized = columnValue === UNCATEGORIZED_VALUE;
        const prevSiblingId = index > 0 ? array[index - 1].columnValue : undefined;
        const nextSiblingId = index < array.length - 1 ? array[index + 1].columnValue : undefined;

        return (
          // TODO(burdon): Root should be headless and come after StackItem.Root?
          <CardStack.Root asChild key={columnValue}>
            <StackItem.Root
              item={{ id: columnValue }}
              size={cardStackDefaultInlineSizeRem}
              disableRearrange={uncategorized}
              focusIndicatorVariant='group'
              prevSiblingId={prevSiblingId}
              nextSiblingId={nextSiblingId}
            >
              <ColumnComponent
                model={model}
                selected={selected}
                multiSelect={multiSelect}
                column={{ columnValue, cards }}
                onAddCard={handleAddCard}
                onRemoveCard={onRemoveCard}
              />

              {/* TODO(burdon): Remove preview once moved to mosaic. */}
              <StackItem.DragPreview>
                {({ item }) => {
                  // Find the column data for this item.
                  const columnData = columns.find((col) => col.columnValue === item.id);
                  if (!columnData) {
                    return null;
                  }

                  const { cards, columnValue } = columnData;
                  const { color, title } = model.getPivotAttributes(columnValue);
                  const uncategorized = columnValue === UNCATEGORIZED_VALUE;
                  return (
                    <CardStackDragPreview.Root>
                      <CardStackDragPreview.Heading>
                        <Tag
                          palette={color as any}
                          data-uncategorized={uncategorized}
                          classNames='mis-1 data-[uncategorized="true"]:mis-2'
                        >
                          {title}
                        </Tag>
                      </CardStackDragPreview.Heading>

                      <CardStackDragPreview.Content itemsCount={cards.length}>
                        {cards.map((card) => (
                          <Card.Root key={card.id}>
                            <Card.Toolbar>
                              <Card.DragHandle />
                              <Card.ToolbarSeparator />
                            </Card.Toolbar>
                            <Surface.Surface
                              role='card--content'
                              limit={1}
                              data={{
                                subject: card,
                                projection: model.projection,
                              }}
                            />
                          </Card.Root>
                        ))}
                      </CardStackDragPreview.Content>
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

//
// Column
//

type ColumnComponentProps<T extends BaseKanbanItem = BaseKanbanItem> = {
  model: KanbanModel<T>;
  selected: string[];
  multiSelect: UseSelectionActions['multiSelect'];
  column: KanbanColumn<T>;
  onAddCard?: (columnValue: string | undefined) => string | undefined;
  onRemoveCard?: (card: T) => void;
};

const ColumnComponent = <T extends BaseKanbanItem = BaseKanbanItem>({
  model,
  selected,
  multiSelect,
  column: { columnValue, cards },
  onAddCard,
  onRemoveCard,
}: ColumnComponentProps<T>) => {
  const { t } = useTranslation(translationKey);

  const { color, title } = model.getPivotAttributes(columnValue);
  const uncategorized = columnValue === UNCATEGORIZED_VALUE;

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => onAddCard?.(columnValue === UNCATEGORIZED_VALUE ? undefined : columnValue),
    [onAddCard],
  );

  return (
    <CardStack.Content footer classNames='kanban-drop border border-separator rounded-md'>
      <CardStack.Stack
        id={columnValue}
        itemsCount={cards.length}
        getDropElement={getColumnDropElement}
        onRearrange={model.handleRearrange}
      >
        {cards.map((item, i, itemArray) => (
          <CardComponent
            key={item.id}
            item={item}
            projection={model.projection}
            selected={selected}
            multiSelect={multiSelect}
            prevSiblingId={i > 0 ? itemArray[i - 1].id : undefined}
            nextSiblingId={i < itemArray.length - 1 ? itemArray[i + 1].id : undefined}
            onRemoveCard={onRemoveCard}
          />
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
        <Card.Toolbar>
          <StackItem.DragHandle asChild>
            <CardStack.DragHandle />
          </StackItem.DragHandle>
          <div className='flex items-center'>
            <Tag
              palette={color as any}
              data-uncategorized={uncategorized}
              classNames='mis-1 data-[uncategorized="true"]:mis-2'
            >
              {title}
            </Tag>
          </div>
        </Card.Toolbar>
      </StackItem.Heading>
    </CardStack.Content>
  );
};

//
// Card
//

type CardComponentProps<T extends BaseKanbanItem = { id: string }> = {
  item: T;
  projection: ProjectionModel;
  selected: string[];
  multiSelect: UseSelectionActions['multiSelect'];
  onRemoveCard?: (card: T) => void;
} & Pick<StackItemRootProps, 'prevSiblingId' | 'nextSiblingId'>;

const CardComponent = <T extends BaseKanbanItem = { id: string }>({
  item,
  projection,
  selected,
  multiSelect,
  prevSiblingId,
  nextSiblingId,
  onRemoveCard,
}: CardComponentProps<T>) => {
  const { t } = useTranslation(translationKey);
  return (
    <CardStack.Item key={item.id} asChild>
      <StackItem.Root
        item={item}
        focusIndicatorVariant='group-always'
        prevSiblingId={prevSiblingId}
        nextSiblingId={nextSiblingId}
        onClick={() => multiSelect([item.id])}
      >
        <Card.Root>
          <Card.Toolbar>
            <StackItem.DragHandle asChild>
              <Card.DragHandle />
            </StackItem.DragHandle>
            <AttentionGlyph attended={selected.includes(item.id)} />
            {onRemoveCard && (
              <Card.Menu
                items={[
                  {
                    label: t('remove card label'),
                    onClick: () => onRemoveCard(item),
                  },
                ]}
              />
            )}
          </Card.Toolbar>
          <Surface.Surface role='card--content' limit={1} data={{ subject: item, projection }} />
        </Card.Root>
        <StackItem.DragPreview>
          {({ item }) => (
            <CardDragPreview.Root>
              <CardDragPreview.Content>
                <Card.Root>
                  <Card.Toolbar>
                    <Card.DragHandle />
                  </Card.Toolbar>
                  <Surface.Surface role='card--content' limit={1} data={{ subject: item, projection }} />
                </Card.Root>
              </CardDragPreview.Content>
            </CardDragPreview.Root>
          )}
        </StackItem.DragPreview>
      </StackItem.Root>
    </CardStack.Item>
  );
};

const getColumnDropElement = (stackElement: HTMLDivElement) => stackElement.closest('.kanban-drop') as HTMLDivElement;
