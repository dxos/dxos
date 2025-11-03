//
// Copyright 2024 DXOS.org
//

import { type ReadonlySignal, type Signal, computed, effect, signal } from '@preact/signals-core';

import { Resource } from '@dxos/context';

import { touch } from '../util';

import { type TableRow } from './table-model';

export type SelectionMode = 'single' | 'multiple';

export class SelectionModel<T extends TableRow> extends Resource {
  private readonly _selection: Signal<Set<string>>;

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
    private readonly _selectionMode: SelectionMode,
    private readonly _initialSelection: string[],
    private readonly _onSelectionChanged?: () => void,
  ) {
    super();
    this._selection = signal(new Set(this._initialSelection));
  }

  protected override async _open(): Promise<void> {
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

  public get selectionMode(): SelectionMode {
    return this._selectionMode;
  }

  public getSelectedRows = (): T[] => {
    const selectedIds = this._validSelectedIds.value;
    return this._rows.value.filter((row) => selectedIds.has(row.id));
  };

  public isRowIndexSelected = (rowIndex: number): boolean => {
    const row = this._rows.value[rowIndex];
    return this._selection.value.has(row.id);
  };

  public isObjectSelected = (object: T): boolean => this._selection.value.has(object.id);

  //
  // Manipulation
  //

  public toggleSelectionForRowIndex = (rowIndex: number): void => {
    const row = this._rows.value[rowIndex];
    const newSelection = new Set(this._selection.value);

    if (newSelection.has(row.id)) {
      newSelection.delete(row.id);
    } else {
      if (this._selectionMode === 'single') {
        newSelection.clear();
      }
      newSelection.add(row.id);
    }

    this._selection.value = newSelection;
  };

  public setSelection = (mode: 'all' | 'none'): void => {
    switch (mode) {
      case 'all': {
        this._selection.value = new Set(this._rows.value.map((row) => row.id));
        break;
      }
      case 'none': {
        this._selection.value = new Set();
        break;
      }
    }
  };
}
