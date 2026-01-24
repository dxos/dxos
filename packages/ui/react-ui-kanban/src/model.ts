//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Resource } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type JsonProp } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { type ProjectionModel, type View } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { type Kanban } from './types';
import { computeArrangement } from './util';

export const UNCATEGORIZED_VALUE = '__uncategorized__' as const;
export const UNCATEGORIZED_ATTRIBUTES = {
  // TODO(ZaymonFC): Add translations for title.
  title: 'Uncategorized',
  color: 'neutral',
} as const;

export type BaseKanbanItem = Record<JsonProp, any> & { id: string };

export type ArrangedCards<T extends BaseKanbanItem = { id: string }> = {
  columnValue: string;
  cards: T[];
}[];

/**
 * Callback type for wrapping mutations in Obj.change().
 * Contains separate callbacks for kanban object and item mutations.
 */
export type KanbanChangeCallback<T extends BaseKanbanItem> = {
  /** Callback to wrap kanban object mutations. */
  kanban: (mutate: (mutableKanban: Kanban.Kanban) => void) => void;
  /** Sets a field on an item, wrapping in Obj.change() if needed. */
  setItemField: (item: T, field: JsonProp, value: unknown) => void;
};

/**
 * Creates a change callback for ECHO-backed kanban and items.
 * Use this when the kanban and items are stored in the ECHO database.
 */
export const createEchoChangeCallback = <T extends BaseKanbanItem>(kanban: Kanban.Kanban): KanbanChangeCallback<T> => ({
  kanban: (mutate) => Obj.change(kanban, (mutableKanban) => mutate(mutableKanban as unknown as Kanban.Kanban)),
  setItemField: (item, field, value) => {
    if (Obj.isObject(item)) {
      Obj.change(item, (mutableItem) => {
        (mutableItem as Record<JsonProp, unknown>)[field] = value;
      });
    } else {
      (item as Record<JsonProp, unknown>)[field] = value;
    }
  },
});

/**
 * Creates a change callback that directly mutates objects without wrapping.
 * Use this for plain JavaScript objects (tests, non-ECHO scenarios).
 */
export const createDirectChangeCallback = <T extends BaseKanbanItem>(
  kanban: Kanban.Kanban,
): KanbanChangeCallback<T> => ({
  kanban: (mutate) => mutate(kanban),
  setItemField: (item, field, value) => {
    (item as Record<JsonProp, unknown>)[field] = value;
  },
});

export type KanbanModelProps<T extends BaseKanbanItem> = {
  registry: Registry.Registry;
  object: Kanban.Kanban;
  projection: ProjectionModel;
  /**
   * Callbacks to wrap mutations in Obj.change().
   * Use createEchoChangeCallback() for ECHO-backed objects or createDirectChangeCallback() for plain objects.
   */
  change: KanbanChangeCallback<T>;
};

export class KanbanModel<T extends BaseKanbanItem = { id: string }> extends Resource {
  private readonly _registry: Registry.Registry;
  private readonly _object: Kanban.Kanban;
  private readonly _projection: ProjectionModel;
  private readonly _change: KanbanChangeCallback<T>;

  private readonly _items: Atom.Writable<T[]>;
  private readonly _cards: Atom.Writable<ArrangedCards<T>>;

  constructor({ registry, object, projection, change }: KanbanModelProps<T>) {
    super();
    this._registry = registry;
    this._object = object;
    this._projection = projection;
    this._change = change;
    this._items = Atom.make<T[]>([]);
    this._cards = Atom.make<ArrangedCards<T>>([]);
  }

  get id() {
    return Obj.getDXN(this._object).toString();
  }

  get object(): Kanban.Kanban {
    return this._object;
  }

  private get _view(): View.View {
    invariant(this._object.view.target, 'Kanban model not initialized');
    return this._object.view.target;
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
   * Atom for reactive access to items.
   */
  get items(): Atom.Atom<T[]> {
    return this._items;
  }

  /**
   * Gets the current items value.
   */
  getItems(): T[] {
    return this._registry.get(this._items);
  }

  /**
   * Sets the items and recomputes the arrangement.
   */
  setItems(items: T[]): void {
    this._registry.set(this._items, items);
    this._moveInvalidItemsToUncategorized();
    this._registry.set(this._cards, this._computeArrangement());
  }

  /**
   * Atom for reactive access to the arranged cards.
   */
  get cards(): Atom.Atom<ArrangedCards<T>> {
    return this._cards;
  }

  /**
   * Gets the current arrangement of kanban items.
   */
  getCards(): ArrangedCards<T> {
    return this._registry.get(this._cards);
  }

  //
  // Lifecycle.
  //

  protected override async _open(): Promise<void> {
    await this._object.view.load();
    this._registry.set(this._cards, this._computeArrangement());
    this._initializeSubscriptions();
  }

  private _initializeSubscriptions(): void {
    // Track item subscriptions for cleanup.
    const itemSubscriptions = new Map<string, () => void>();

    const recomputeArrangement = () => {
      this._registry.set(this._cards, this._computeArrangement());
    };

    // Subscribe to changes in the items list to manage individual item subscriptions.
    // Note: We don't call recomputeArrangement() here because setItems() handles it.
    const itemsUnsubscribe = this._registry.subscribe(this._items, () => {
      // Unsubscribe from old items.
      for (const [id, unsub] of itemSubscriptions) {
        unsub();
        itemSubscriptions.delete(id);
      }

      // Subscribe to each item's changes.
      const items = this._registry.get(this._items);
      for (const item of items) {
        if (Obj.isObject(item) && !itemSubscriptions.has(item.id)) {
          const unsub = Obj.subscribe(item, recomputeArrangement);
          itemSubscriptions.set(item.id, unsub);
        }
      }
    });

    this._ctx.onDispose(() => {
      itemsUnsubscribe();
      for (const unsub of itemSubscriptions.values()) {
        unsub();
      }
    });
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
   * Handler for card and column rearrangement events.
   * Supports both reordering columns and moving cards between columns.
   */
  public handleRearrange: StackItemRearrangeHandler = (source, target, closestEdge) => {
    // Deep clone to ensure reactivity (new array reference triggers atom notifications).
    const nextArrangement = this.getCards().map((col) => ({
      columnValue: col.columnValue,
      cards: [...col.cards],
    }));
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

    this._change.kanban((mutableKanban) => {
      mutableKanban.arrangement = nextArrangement.map(({ columnValue, cards }) => ({
        columnValue,
        ids: cards.map(({ id }) => id),
      }));
    });
    this._registry.set(this._cards, nextArrangement);
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

    return computeArrangement<T>({
      object: this.object,
      items: this._registry.get(this._items),
      pivotPath: this.columnFieldPath,
      selectOptions: options,
    });
  }

  /**
   * Moves items with invalid column values to uncategorized by setting their column field to undefined.
   */
  private _moveInvalidItemsToUncategorized(): void {
    const columnPath = this.columnFieldPath;
    if (columnPath === undefined) {
      return;
    }

    const validColumnValues = new Set(this._getSelectOptions()?.map((opt) => opt.id));
    for (const item of this._registry.get(this._items)) {
      const itemColumn = item[columnPath];
      if (itemColumn && !validColumnValues.has(itemColumn)) {
        // Set to undefined which will place it in uncategorized.
        this._change.setItemField(item, columnPath, undefined);
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

    this._projection.setFieldProjection({
      ...fieldProjection,
      props: { ...fieldProjection.props, options },
    });
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
    if (columnField !== undefined) {
      const newValue = targetColumn.columnValue === UNCATEGORIZED_VALUE ? undefined : targetColumn.columnValue;
      this._change.setItemField(movedCard, columnField, newValue);
    }

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
