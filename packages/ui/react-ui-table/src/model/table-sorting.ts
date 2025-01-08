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
    this.sortedRows = computed(() => {
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

        return {
          item,
          index,
          value: sortValue,
          isEmpty: !(props.type === TypeEnum.Boolean) && (sortValue == null || sortValue === ''),
        };
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

  public getDataIndex(displayIndex: number): number {
    return this._displayToDataIndex.get(displayIndex) ?? displayIndex;
  }

  public setSort(fieldId: string, direction: SortDirection): void {
    this._sorting.value = { fieldId, direction };
  }

  private getSortValue(props: PropertyType, field: FieldType, item: T) {
    const rawValue = getValue(item, field.path);

    if (props.type === TypeEnum.Boolean) {
      return !!rawValue; // Coerce null/undefined/false to false for booleans.
    }
    if (props.type === TypeEnum.Number) {
      return rawValue;
    }
    if (rawValue == null) {
      return rawValue;
    }

    // TODO(Zaymon): Should we format this returned value for display based on the referenced prop format?
    //   Right now we're going to be sorting based on the raw values.
    if (props.format === FormatEnum.Ref && field.referencePath) {
      return getValue(rawValue, field.referencePath);
    }

    return formatForDisplay({
      type: props.type,
      format: props.format,
      value: rawValue,
    });
  }
}
