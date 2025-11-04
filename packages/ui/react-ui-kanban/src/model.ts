//
// Copyright 2025 DXOS.org
//

import { batch, effect, signal, untracked } from '@preact/signals-core';
import type * as Schema from 'effect/Schema';

import { Resource } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type JsonProp } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { type DataType, type ProjectionModel } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { Kanban } from './types';
import { computeArrangement } from './util';

export const UNCATEGORIZED_VALUE = '__uncategorized__' as const;
export const UNCATEGORIZED_ATTRIBUTES = {
  // TODO(ZaymonFC): Add translations for title.
  title: 'Uncategorized',
  color: 'neutral',
} as const;

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type ArrangedCards<T extends BaseKanbanItem = { id: string }> = { columnValue: string; cards: T[] }[];

export type KanbanModelProps = {
  view: DataType.View;
  schema: Schema.Schema.AnyNoContext;
  projection: ProjectionModel;
};

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _view: DataType.View;
  private readonly _schema: Schema.Schema.AnyNoContext;
  private readonly _projection: ProjectionModel;
  private _kanban?: Kanban.Kanban;

  private readonly _items = signal<T[]>([]);
  private readonly _cards = signal<ArrangedCards<T>>([]);

  constructor({ view, schema, projection }: KanbanModelProps) {
    super();
    this._view = view;
    this._schema = schema;
    this._projection = projection;
  }

  get id() {
    return fullyQualifiedId(this._view);
  }

  get kanban(): Kanban.Kanban {
    invariant(this._kanban, 'Kanban model not initialized');
    return this._kanban;
  }

  get projection(): ProjectionModel {
    return this._projection;
  }

  get columnFieldPath(): JsonProp | undefined {
    const columnFieldId = this._view.projection.pivotFieldId;
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

  protected override async _open(): Promise<void> {
    const presentation = this._view.presentation.target ?? (await this._view.presentation.load());
    invariant(Obj.instanceOf(Kanban.Kanban, presentation));
    this._kanban = presentation;

    this._computeArrangement();
    this.initializeEffects();
  }

  private initializeEffects(): void {
    const arrangementWatcher = effect(() => {
      // Subscribe to changes in:
      // - the current column field selection
      const pivotPath = this.columnFieldPath;
      // - the column field selection options
      void this._getSelectOptions();
      // - the list of items
      const items = this._items.value;
      // - and each item's column field value
      if (pivotPath) {
        for (const item of items) {
          item[pivotPath];
        }
      }

      // Finally, recompute arrangement.
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

      this.kanban.arrangement = nextArrangement.map(({ columnValue, cards }) => ({
        columnValue,
        ids: cards.map(({ id }) => id),
      }));
      this._cards.value = nextArrangement;
    });
  };

  //
  // Private logic.
  //

  private _getSelectOptions(): { id: string; title: string; color: string }[] {
    if (this._view.projection.pivotFieldId === undefined) {
      return [];
    }

    return this._projection.tryGetFieldProjection(this._view.projection.pivotFieldId)?.props.options ?? [];
  }

  private _computeArrangement(): ArrangedCards<T> {
    const options = this._getSelectOptions();
    if (!options) {
      return [];
    }

    return untracked(() =>
      computeArrangement<T>({
        kanban: this.kanban,
        items: this._items.value,
        pivotPath: this.columnFieldPath,
        selectOptions: options,
      }),
    );
  }

  /**
   * Moves items with invalid column values to uncategorized by setting their column field to undefined.
   */
  private _moveInvalidItemsToUncategorized(): void {
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
  private _findColumn(id: string, arrangement: ArrangedCards<T>): { columnValue: string; cards: T[] } | undefined {
    return arrangement.find(({ columnValue, cards }) => columnValue === id || cards.some((card) => card.id === id));
  }

  /**
   * Updates the field projection options to reorder columns. Updating the arrangement
   * is not necessary as it's done automatically when the field projection updates.
   */
  private _handleColumnReorder(source: { id: string }, target: { id: string }, closestEdge: 'left' | 'right'): void {
    if (source.id === UNCATEGORIZED_VALUE || target.id === UNCATEGORIZED_VALUE) {
      return;
    }

    if (!this._view.projection.pivotFieldId) {
      return;
    }

    const fieldProjection = this._projection.getFieldProjection(this._view.projection.pivotFieldId);
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
  ): void {
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
