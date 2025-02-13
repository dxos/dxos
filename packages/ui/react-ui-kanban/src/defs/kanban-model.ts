//
// Copyright 2025 DXOS.org
//
import { signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type JsonProp, type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { type ViewProjection } from '@dxos/schema';

import { type KanbanType } from './kanban';
import { computeArrangement } from '../util';

export const UNCATEGORIZED_VALUE = '__uncategorized__' as const;
export const UNCATEGORIZED_ATTRIBUTES = {
  // TODO(ZaymonFC): Add translations for title.
  title: 'Uncategorized',
  color: 'neutral',
} as const;

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type KanbanModelProps = {
  kanban: KanbanType;
  cardSchema: EchoSchema;
  projection: ViewProjection;
};

export type KanbanArrangement<T extends BaseKanbanItem = { id: string }> = { columnValue: string; cards: T[] }[];

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _kanban: KanbanType;
  private readonly _cardSchema: EchoSchema;
  private readonly _projection: ViewProjection;
  private _items = signal<T[]>([]);
  private _arrangement = signal<KanbanArrangement<T>>([]);

  private _getSelectOptions() {
    invariant(this._kanban.columnField);
    const fieldId = this._projection.getFieldId(this._kanban.columnField);
    invariant(fieldId);
    return this._projection.getFieldProjection(fieldId).props.options;
  }

  private _ensureValidColumns() {
    if (!this._kanban.columnField) {
      return;
    }

    const validColumnValues = new Set(this._getSelectOptions()?.map((opt) => opt.id));

    for (const item of this._items.value) {
      const itemColumn = item[this._kanban.columnField as keyof typeof item];
      if (itemColumn && !validColumnValues.has(itemColumn as string)) {
        // Set to undefined which will place it in uncategorized
        item[this._kanban.columnField as keyof typeof item] = undefined as any;
      }
    }
  }

  private _cleanupArrangement() {
    if (!this._kanban.arrangement) {
      return;
    }

    const validColumnValues = new Set(this._getSelectOptions()?.map((opt) => opt.id));

    for (let i = this._kanban.arrangement.length - 1; i >= 0; i--) {
      const col = this._kanban.arrangement[i];
      if (col.columnValue !== UNCATEGORIZED_VALUE && !validColumnValues.has(col.columnValue)) {
        this._kanban.arrangement.splice(i, 1);
      }
    }
  }

  private _computeArrangement(): KanbanArrangement<T> {
    const options = this._getSelectOptions();
    invariant(options);
    this._ensureValidColumns();
    this._cleanupArrangement();
    return computeArrangement<T>(this._kanban, this._items.value, options);
  }

  constructor({ kanban, cardSchema, projection }: KanbanModelProps) {
    super();
    this._kanban = kanban;
    this._cardSchema = cardSchema;
    this._projection = projection;
    this._arrangement.value = this._computeArrangement();
  }

  get columnField() {
    return this._kanban.columnField;
  }

  /**
   * @reactive Gets the current items.
   */
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

  /**
   * @reactive Gets the current arrangement of kanban items.
   */
  get arrangement() {
    return this._arrangement.value;
  }

  /** Get the display attributes for a column by its ID. */
  public getPivotAttributes(id: string) {
    if (id === UNCATEGORIZED_VALUE) {
      return UNCATEGORIZED_ATTRIBUTES;
    }

    const options = this._getSelectOptions();
    invariant(options);
    const option = options?.find((option) => option.id === id);
    return option ?? ({ title: id, color: 'neutral' } as const);
  }

  public addEmptyColumn(columnValue: string) {
    this._kanban.arrangement ??= [];
    this._kanban.arrangement.push({ columnValue, ids: [] });
    this._arrangement.value = this._computeArrangement();
  }

  public removeColumnFromArrangement(columnValue: string) {
    if (columnValue === UNCATEGORIZED_VALUE) {
      return;
    }
    const columnIndex = this._kanban.arrangement?.findIndex((column) => column.columnValue === columnValue);
    if (this._kanban.arrangement && columnIndex !== undefined && Number.isFinite(columnIndex) && columnIndex >= 0) {
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
        if (source.id === UNCATEGORIZED_VALUE || target.id === UNCATEGORIZED_VALUE) {
          return;
        }
        // Reordering columns
        const sourceIndex = nextArrangement.findIndex(({ columnValue }) => columnValue === source.id);
        const targetIndex = nextArrangement.findIndex(({ columnValue }) => columnValue === target.id);
        const [movedColumn] = nextArrangement.splice(sourceIndex, 1);
        const insertIndex = closestEdge === 'right' ? targetIndex + 1 : targetIndex;
        nextArrangement.splice(insertIndex, 0, movedColumn);
      } else {
        const sourceCardIndex = sourceColumn.cards.findIndex((card) => card.id === source.id);
        const targetCardIndex = targetColumn.cards.findIndex((card) => card.id === target.id);
        if (
          typeof sourceCardIndex === 'number' &&
          typeof targetCardIndex === 'number' &&
          sourceColumn.cards &&
          targetColumn.cards
        ) {
          const [movedCard] = sourceColumn.cards.splice(sourceCardIndex, 1);

          (movedCard[this._kanban.columnField! as keyof typeof movedCard] as any) =
            targetColumn.columnValue === UNCATEGORIZED_VALUE ? undefined : targetColumn.columnValue;

          let insertIndex;
          if (source.type === 'card' && target.type === 'column') {
            insertIndex = 0;
          } else if (sourceCardIndex < targetCardIndex) {
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
