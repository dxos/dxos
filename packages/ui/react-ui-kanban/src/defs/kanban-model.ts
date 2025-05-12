//
// Copyright 2025 DXOS.org
//

import { batch, effect, signal, untracked } from '@preact/signals-core';

import { Resource } from '@dxos/context';
import { type JsonProp, type TypedObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { type ViewProjection } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { type KanbanType } from './kanban';
import { computeArrangement } from '../util';

export const UNCATEGORIZED_VALUE = '__uncategorized__' as const;
export const UNCATEGORIZED_ATTRIBUTES = {
  // TODO(ZaymonFC): Add translations for title.
  title: 'Uncategorized',
  color: 'neutral',
} as const;

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type ArrangedCards<T extends BaseKanbanItem = { id: string }> = { columnValue: string; cards: T[] }[];

export type KanbanModelProps = {
  kanban: KanbanType;
  schema: TypedObject<any, any>;
  projection: ViewProjection;
};

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _kanban: KanbanType;
  private readonly _schema: TypedObject<any, any>;
  private readonly _projection: ViewProjection;
  private _items = signal<T[]>([]);
  private _cards = signal<ArrangedCards<T>>([]);

  constructor({ kanban, schema, projection }: KanbanModelProps) {
    super();
    this._kanban = kanban;
    this._schema = schema;
    this._projection = projection;
    this._computeArrangement();
  }

  get kanban() {
    return this._kanban;
  }

  get id() {
    return this._kanban.id;
  }

  get columnFieldPath(): JsonProp | undefined {
    const columnFieldId = this._kanban.columnFieldId;
    if (columnFieldId === undefined) {
      return undefined;
    }
    const columnFieldProjection = this._projection.tryGetFieldProjection(columnFieldId);
    return columnFieldProjection?.props.property;
  }

  /**
   * @reactive Gets the current items.
   */
  get items() {
    return this._items.value;
  }

  set items(items: T[]) {
    untracked(() => {
      this._items.value = items;
      this._moveInvalidItemsToUncategorized();
      this._cards.value = this._computeArrangement();
    });
  }

  get schema() {
    return this._schema;
  }

  /**
   * @reactive Gets the current arrangement of kanban items.
   */
  get arrangedCards() {
    return this._cards.value;
  }

  //
  // Lifecycle.
  //

  protected override async _open() {
    this.initializeEffects();
  }

  private initializeEffects(): void {
    const arrangementWatcher = effect(() => {
      const _ = this._kanban.columnFieldId;
      this._cards.value = this._computeArrangement();
    });
    this._ctx.onDispose(arrangementWatcher);
  }

  //
  // Public API.
  //

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

  /**
   * Handler for card and column rearrangement events. Supports both reordering columns and moving cards between columns.
   */
  public handleRearrange: StackItemRearrangeHandler = (source, target, closestEdge) => {
    batch(() => {
      const nextArrangement = this.arrangedCards;
      const sourceColumn = this._findColumn(source.id, nextArrangement);
      const targetColumn = this._findColumn(target.id, nextArrangement);

      if (!sourceColumn || !targetColumn) {
        return;
      }

      if (source.type === 'column' && target.type === 'column') {
        this._handleColumnReorder(source, target, closestEdge as 'left' | 'right');
        return;
      }

      this._handleCardMove(sourceColumn, targetColumn, source, target, closestEdge as 'top' | 'bottom');

      this._kanban.arrangement = nextArrangement.map(({ columnValue, cards }) => ({
        columnValue,
        ids: cards.map(({ id }) => id),
      }));
      this._cards.value = nextArrangement;
    });
  };

  //
  // Private logic.
  //

  private _getSelectOptions() {
    if (this._kanban.columnFieldId === undefined) {
      return [];
    }

    return this._projection.tryGetFieldProjection(this._kanban.columnFieldId)?.props.options ?? [];
  }

  private _computeArrangement(): ArrangedCards<T> {
    const options = this._getSelectOptions();
    if (!options) {
      return [];
    }

    return untracked(() => {
      return computeArrangement<T>({
        kanban: this._kanban,
        items: this._items.value,
        pivotPath: this.columnFieldPath,
        selectOptions: options,
      });
    });
  }

  /**
   * Moves items with invalid column values to uncategorized by setting their column field to undefined.
   */
  private _moveInvalidItemsToUncategorized() {
    const validColumnValues = new Set(this._getSelectOptions()?.map((opt) => opt.id));
    const columnPath = this.columnFieldPath;
    for (const item of this._items.value) {
      const itemColumn = item[columnPath as keyof typeof item];
      if (itemColumn && !validColumnValues.has(itemColumn as string)) {
        // Set to undefined which will place it in uncategorized.
        item[columnPath as keyof typeof item] = undefined as any;
      }
    }
  }

  /** Find a column by ID in the arrangement, checking both column values and card IDs. */
  private _findColumn(id: string, arrangement: ArrangedCards<T>) {
    return arrangement.find(({ columnValue, cards }) => columnValue === id || cards.some((card) => card.id === id));
  }

  /**
   * Updates the field projection options to reorder columns. Updating the arrangement
   * is not necessary as it's done automatically when the field projection updates.
   */
  private _handleColumnReorder(source: { id: string }, target: { id: string }, closestEdge: 'left' | 'right') {
    if (source.id === UNCATEGORIZED_VALUE || target.id === UNCATEGORIZED_VALUE) {
      return;
    }

    if (!this._kanban.columnFieldId) {
      return;
    }

    const fieldProjection = this._projection.getFieldProjection(this._kanban.columnFieldId);
    const options = [...(fieldProjection.props.options ?? [])];
    const sourceIndex = options.findIndex((opt) => opt.id === source.id);
    const targetIndex = options.findIndex((opt) => opt.id === target.id);
    const insertIndex =
      source.id === target.id
        ? sourceIndex
        : targetIndex +
          (targetIndex > sourceIndex ? (closestEdge === 'right' ? 0 : -1) : closestEdge === 'right' ? 1 : 0);
    arrayMove(options, sourceIndex, insertIndex);

    this._projection.setFieldProjection({ ...fieldProjection, props: { ...fieldProjection.props, options } });
  }

  /**
   * Handles moving a card **between columns**, or to a different position within the **same column**.
   * Updates both the card's position and its column field value.
   * Returns the updated source and target columns.
   */
  private _handleCardMove(
    sourceColumn: ArrangedCards<T>[number],
    targetColumn: ArrangedCards<T>[number],
    source: { id: string; type: 'card' | 'column' },
    target: { id: string; type: 'card' | 'column' },
    closestEdge: 'top' | 'bottom',
  ) {
    const sourceCardIndex = sourceColumn.cards.findIndex((card) => card.id === source.id);
    const targetCardIndex = targetColumn.cards.findIndex((card) => card.id === target.id);

    const indicesAreNumeric = typeof sourceCardIndex === 'number' && typeof targetCardIndex === 'number';
    const columnsHaveCards = sourceColumn.cards && targetColumn.cards;
    if (!indicesAreNumeric || !columnsHaveCards) {
      return;
    }

    const columnField = this.columnFieldPath;
    const [movedCard] = sourceColumn.cards.splice(sourceCardIndex, 1);
    (movedCard[columnField as keyof typeof movedCard] as any) =
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
