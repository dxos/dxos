//
// Copyright 2025 DXOS.org
//

import { computed, type Signal, signal, type ReadonlySignal } from '@preact/signals-core';
import orderBy from 'lodash.orderby';

import { getValue, FormatEnum, TypeEnum } from '@dxos/echo-schema';
import { formatForDisplay } from '@dxos/react-ui-form';
import { type PropertyType, type FieldType, type ViewProjection } from '@dxos/schema';

import { type BaseTableRow } from './table-model';
import { type TableType } from '../types';

export type SortDirection = 'asc' | 'desc';
export type SortConfig = { fieldId: string; direction: SortDirection };

export class TableSorting<T extends BaseTableRow> {
  private readonly _displayToDataIndex = new Map<number, number>();
  private readonly _sorting = signal<SortConfig | undefined>(undefined);
  private readonly _rows: Signal<T[]>;
  public readonly sortedRows: ReadonlySignal<T[]>;

  constructor(
    rows: Signal<T[]>,
    private readonly _table: TableType,
    private readonly _projection: ViewProjection,
  ) {
    this._rows = rows;
    this.sortedRows = this.initialiseSortedRows();
  }

  private initialiseSortedRows(): ReadonlySignal<T[]> {
    return computed(() => {
      this._displayToDataIndex.clear();
      const sort = this._sorting.value;
      if (!sort) {
        return this._rows.value;
      }

      const field = this._table.view?.target?.fields.find((f) => f.id === sort.fieldId);
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

  public get sorting(): ReadonlySignal<SortConfig | undefined> {
    return this._sorting;
  }

  public getDataIndex(displayIndex: number): number {
    return this._displayToDataIndex.get(displayIndex) ?? displayIndex;
  }

  public setSort(fieldId: string, direction: SortDirection): void {
    this._sorting.value = { fieldId, direction };
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

    // TODO(Zaymon): Should we format this returned value for display based on the referenced prop format?
    //   Right now we're going to be sorting based on the raw values.
    //   Maybe we need to recurse this function with the referenced prop format and field?
    if (format === FormatEnum.Ref && field.referencePath) {
      const refValue = getValue(value.target, field.referencePath);
      return refValue;
    }

    return formatForDisplay({ type, format, value });
  }
}
