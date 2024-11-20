//
// Copyright 2024 DXOS.org
//

import { computed, effect, signal, type ReadonlySignal } from '@preact/signals-core';

import { Resource } from '@dxos/context';

import { type BaseTableRow } from './table-model';
import { touch } from '../util';

export class SelectionModel<T extends BaseTableRow> extends Resource {
  private readonly _selection = signal<Set<string>>(new Set());

  private readonly _validSelectedIds = computed<Set<string>>(() => {
    const rows = this._rows.value;
    if (!rows) {
      return new Set<string>();
    }
    const validIds = new Set(rows.map((row) => row.id));
    return new Set([...this._selection.value].filter((id) => validIds.has(id)));
  });

  private readonly _hasSelection = computed<boolean>(() => this._validSelectedIds.value.size > 0);

  private readonly _allSelected = computed<boolean>(() => {
    const rows = this._rows.value;
    if (rows.length === 0) {
      return false;
    }
    return rows.every((row) => this._selection.value.has(row.id));
  });

  constructor(
    private readonly _rows: ReadonlySignal<T[]>,
    private readonly _onSelectionChanged?: () => void,
  ) {
    super();
  }

  protected override async _open() {
    const selectionWatcher = effect(() => {
      touch(this._selection.value);
      this._onSelectionChanged?.();
    });
    this._ctx.onDispose(selectionWatcher);
  }

  //
  // Getters
  //

  public get selection(): ReadonlySignal<Set<string>> {
    return this._selection;
  }

  public get hasSelection(): ReadonlySignal<boolean> {
    return this._hasSelection;
  }

  public get allRowsSeleted(): ReadonlySignal<boolean> {
    return this._allSelected;
  }

  public getSelectedRows = (): T[] => {
    const selectedIds = this._validSelectedIds.value;
    return this._rows.value.filter((row) => selectedIds.has(row.id));
  };

  public isRowIndexSelected = (rowIndex: number): boolean => {
    const row = this._rows.value[rowIndex];
    return this._selection.value.has(row.id);
  };

  public isObjectSelected = (object: T): boolean => {
    return this._selection.value.has(object.id);
  };

  //
  // Manipulation
  //

  public toggleSelectionForRowIndex = (rowIndex: number): void => {
    const row = this._rows.value[rowIndex];
    const newSelection = new Set(this._selection.value);

    if (newSelection.has(row.id)) {
      newSelection.delete(row.id);
    } else {
      newSelection.add(row.id);
    }

    this._selection.value = newSelection;
  };

  public setSelection = (mode: 'all' | 'none'): void => {
    this._selection.value = mode === 'all' ? new Set(this._rows.value.map((row) => row.id)) : new Set();
  };
}
