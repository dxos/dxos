//
// Copyright 2025 DXOS.org
//

import { computed, signal, type Signal, type ReadonlySignal } from '@preact/signals-core';
import orderBy from 'lodash.orderby';

import { getValue, FormatEnum, TypeEnum, type SortDirectionType, type FieldSortType } from '@dxos/echo-schema';
import { formatForDisplay } from '@dxos/react-ui-form';
import type { PropertyType, FieldType, ViewProjection, ViewType } from '@dxos/schema';

import { type BaseTableRow } from './table-model';

/**
 * Represents the local sort state.
 * - undefined: No local sort set, fallback to view sort.
 * - cleared: Sort explicitly cleared by user.
 * - active: Active local sort with sort configuration.
 */
type LocalSort = { type: 'cleared' } | { type: 'active'; sort: FieldSortType } | undefined;

/**
 * Manages table sorting functionality through display and data index mapping.
 *
 * When a table is sorted, rows visually reorder but we need to maintain references
 * to the original data positions. This is handled through two types of indices:
 *
 * - Display indices: The visual positions after sorting
 * - Data indices: The original positions in the source data
 *
 * The _displayToDataIndex map maintains these relationships, enabling lookups
 * between visual and source positions.
 *
 * Example mapping between display and data indices:
 *
 * Original Data:        Sorted Display:       Mapping: (Display → Data)
 * ┌──────────────┐      ┌──────────────┐      ┌────────┐
 * │ 0: "Banana"  │  =>  │ 0: "Apple"   │  =>  │ 0 => 1 │
 * │ 1: "Apple"   │  =>  │ 1: "Banana"  │  =>  │ 1 => 0 │
 * │ 2: "Cherry"  │  =>  │ 2: "Cherry"  │  =>  │ 2 => 2 │
 * └──────────────┘      └──────────────┘      └────────┘
 */
export class TableSorting<T extends BaseTableRow> {
  private readonly _displayToDataIndex = new Map<number, number>();
  private readonly _rows: Signal<T[]>;
  private readonly _localSort = signal<LocalSort>(undefined);
  private readonly _isDirty: ReadonlySignal<boolean>;
  public readonly sortedRows: ReadonlySignal<T[]>;

  constructor(
    rows: Signal<T[]>,
    private readonly _view: ViewType | undefined,
    private readonly _projection: ViewProjection,
  ) {
    this._rows = rows;
    this._isDirty = computed(() => {
      const local = this._localSort.value;
      const viewSort = this._view?.query.sort?.[0];
      if (local?.type === 'cleared') {
        return viewSort !== undefined;
      }
      if (local?.type === 'active') {
        if (!viewSort) {
          return true;
        }
        return local.sort.fieldId !== viewSort.fieldId || local.sort.direction !== viewSort.direction;
      }
      return false;
    });
    this.sortedRows = this.initialiseSortedRows();
  }

  /**
   * @reactive
   * @returns Local sort if present, falls back to view sort.
   */
  public get sorting(): FieldSortType | undefined {
    const local = this._localSort.value;
    if (local?.type === 'cleared') {
      return undefined;
    }
    if (local?.type === 'active') {
      return local.sort;
    }
    return this._view?.query.sort?.[0];
  }

  /**
   * @reactive
   * @returns Whether local sort differs from view sort.
   */
  public get isDirty(): boolean {
    return this._isDirty.value;
  }

  public getDataIndex(displayIndex: number): number {
    return this._displayToDataIndex.get(displayIndex) ?? displayIndex;
  }

  public setSort(fieldId: string, direction: SortDirectionType): void {
    this._localSort.value = {
      type: 'active',
      sort: { fieldId, direction },
    };
  }

  public toggleSort(fieldId: string): void {
    if (!this._view || !this.sorting || this.sorting.fieldId !== fieldId) {
      return;
    }

    switch (this.sorting.direction) {
      case 'asc': {
        this.setSort(fieldId, 'desc');
        break;
      }
      case 'desc': {
        this.setSort(fieldId, 'asc');
        break;
      }
    }
  }

  public clearSort(): void {
    this._localSort.value = { type: 'cleared' };
  }

  public save(): void {
    if (this._view && this._localSort.value !== undefined) {
      if (this._localSort.value.type === 'active') {
        this._view.query.sort = [this._localSort.value.sort];
      } else {
        this._view.query.sort = [];
      }
      this._localSort.value = undefined;
    }
  }

  //
  // Initialisation.
  //

  private initialiseSortedRows(): ReadonlySignal<T[]> {
    return computed(() => {
      this._displayToDataIndex.clear();
      const sort = this.sorting;
      if (!sort || !this._view) {
        return this._rows.value;
      }

      const field = this._view.fields.find((f) => f.id === sort.fieldId);
      if (!field) {
        return this._rows.value;
      }

      const { props } = this._projection.getFieldProjection(field.id);

      const dataWithIndices = this._rows.value.map((item, index) => {
        const sortValue = this.getSortValue(props, field, item);
        const isEmpty = !(props.type === TypeEnum.Boolean) && (sortValue == null || sortValue === '');

        return { item, index, value: sortValue, isEmpty };
      });

      const ordered = orderBy(dataWithIndices, ['isEmpty', 'value'], ['asc', sort.direction]);

      ordered.forEach(({ index: dataIndex }, displayIndex) => {
        if (displayIndex !== dataIndex) {
          this._displayToDataIndex.set(displayIndex, dataIndex);
        }
      });

      return ordered.map(({ item }) => item);
    });
  }

  private getSortValue(props: PropertyType, field: FieldType, item: T) {
    const { type, format } = props;
    const value = getValue(item, field.path);

    if (type === TypeEnum.Boolean) {
      return !!value; // Coerce null/undefined to false for booleans.
    }
    if (type === TypeEnum.Number) {
      return value;
    }
    if (value == null) {
      return value;
    }

    // TODO(ZaymonFC): Should we format this returned value for display based on the referenced prop format?
    //   Right now we're going to be sorting based on the raw values.
    //   Maybe we need to recurse this function with the referenced prop format and field?
    if (format === FormatEnum.Ref && field.referencePath) {
      const refValue = getValue(value.target, field.referencePath);
      return refValue;
    }

    return formatForDisplay({ type, format, value });
  }
}
