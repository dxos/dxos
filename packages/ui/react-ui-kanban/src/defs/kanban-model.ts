//
// Copyright 2024 DXOS.org
//
import { signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type JsonProp, type MutableSchema } from '@dxos/echo-schema';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';

import { type KanbanType } from './kanban';
import { computeArrangement } from '../util';

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type KanbanModelProps = {
  kanban: KanbanType;
  cardSchema: MutableSchema;
};

export type KanbanArrangement<T extends BaseKanbanItem = { id: string }> = { columnValue: string; cards: T[] }[];

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _kanban: KanbanType;
  private readonly _cardSchema: MutableSchema;
  private _items = signal<T[]>([]);
  private _arrangement = signal<KanbanArrangement<T>>([]);

  private _computeArrangement(): KanbanArrangement<T> {
    return computeArrangement<T>(this._kanban, this._items.value);
  }

  constructor({ kanban, cardSchema }: KanbanModelProps) {
    super();
    this._kanban = kanban;
    this._cardSchema = cardSchema;
    this._arrangement.value = this._computeArrangement();
  }

  get items() {
    return this._items.value;
  }

  set items(items: T[]) {
    this._items.value = items;
    this._arrangement.value = this._computeArrangement();
  }

  get cardSchema() {
    return this._cardSchema;
  }

  get arrangement() {
    return this._arrangement.value;
  }

  public addEmptyColumn(columnValue: string) {
    // @ts-ignore
    this._kanban.arrangement!.push({ columnValue, ids: [] });
    this._arrangement.value = this._computeArrangement();
  }

  public removeColumnFromArrangement(columnValue: string) {
    const columnIndex = this._kanban.arrangement?.findIndex((column) => column.columnValue === columnValue);
    if (this._kanban.arrangement && Number.isFinite(columnIndex) && columnIndex! >= 0) {
      // @ts-ignore
      this._kanban.arrangement.splice(columnIndex, 1);
      this._arrangement.value = this._computeArrangement();
    }
  }

  public onRearrange: StackItemRearrangeHandler = (source, target, closestEdge) => {
    const nextArrangement = this.arrangement;
    const sourceColumn = nextArrangement.find(
      ({ columnValue, cards }) => columnValue === source.id || cards.some((card) => card.id === source.id),
    );
    const targetColumn = nextArrangement.find(
      ({ columnValue, cards }) => columnValue === target.id || cards.some((card) => card.id === target.id),
    );

    if (sourceColumn && targetColumn) {
      if (source.type === 'column' && target.type === 'column') {
        // Reordering columns
        const sourceIndex = nextArrangement.findIndex(({ columnValue }) => columnValue === source.id);
        const targetIndex = nextArrangement.findIndex(({ columnValue }) => columnValue === target.id);
        const [movedColumn] = nextArrangement.splice(sourceIndex, 1);
        const insertIndex = closestEdge === 'right' ? targetIndex + 1 : targetIndex;
        nextArrangement.splice(insertIndex, 0, movedColumn);
      } else {
        // Reordering cards within a column
        const sourceCardIndex = sourceColumn.cards.findIndex((card) => card.id === source.id);
        const targetCardIndex = targetColumn.cards.findIndex((card) => card.id === target.id);
        if (
          typeof sourceCardIndex === 'number' &&
          typeof targetCardIndex === 'number' &&
          sourceColumn.cards &&
          targetColumn.cards
        ) {
          const [movedCard] = sourceColumn.cards.splice(sourceCardIndex, 1);

          (movedCard[this._kanban.columnField! as keyof typeof movedCard] as any) = targetColumn.columnValue;

          let insertIndex;
          if (sourceCardIndex < targetCardIndex) {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex : targetCardIndex - 1;
          } else {
            insertIndex = closestEdge === 'bottom' ? targetCardIndex + 1 : targetCardIndex;
          }
          targetColumn.cards.splice(insertIndex, 0, movedCard);
        }
      }

      this._kanban.arrangement = nextArrangement.map(({ columnValue, cards }) => {
        return { columnValue, ids: cards.map(({ id }) => id) };
      });

      this._arrangement.value = nextArrangement;
    }
  };
}
