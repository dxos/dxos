//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';

import { Resource } from '@dxos/context';

import { type TableRow } from './table-model';

export type SelectionMode = 'single' | 'multiple';

export class SelectionModel<T extends TableRow> extends Resource {
  private readonly _registry: Registry.Registry;
  private readonly _rows: Atom.Atom<T[]>;
  private readonly _selection: Atom.Writable<Set<string>>;
  private readonly _validSelectedIds: Atom.Atom<Set<string>>;
  private readonly _hasSelection: Atom.Atom<boolean>;
  private readonly _allSelected: Atom.Atom<boolean>;
  private readonly _selectionMode: SelectionMode;
  private readonly _onSelectionChanged?: () => void;

  constructor(
    registry: Registry.Registry,
    rows: Atom.Atom<T[]>,
    selectionMode: SelectionMode,
    initialSelection: string[],
    onSelectionChanged?: () => void,
  ) {
    super();
    this._registry = registry;
    this._rows = rows;
    this._selectionMode = selectionMode;
    this._onSelectionChanged = onSelectionChanged;

    this._selection = Atom.make<Set<string>>(new Set(initialSelection));

    this._validSelectedIds = Atom.make((get) => {
      const rows = get(this._rows);
      if (!rows) {
        return new Set<string>();
      }

      const validIds = new Set(rows.map((row) => row.id));
      const selection = get(this._selection);
      return new Set([...selection].filter((id) => validIds.has(id)));
    });

    this._hasSelection = Atom.make((get) => get(this._validSelectedIds).size > 0);

    this._allSelected = Atom.make((get) => {
      const rows = get(this._rows);
      if (rows.length === 0) {
        return false;
      }

      const selection = get(this._selection);
      return rows.every((row) => selection.has(row.id));
    });
  }

  protected override async _open(): Promise<void> {
    const selectionUnsubscribe = this._registry.subscribe(this._selection, () => {
      this._onSelectionChanged?.();
    });
    this._ctx.onDispose(selectionUnsubscribe);
  }

  //
  // Getters
  //

  /** Get the selection atom for reactive access. */
  public get selectionAtom(): Atom.Atom<Set<string>> {
    return this._selection;
  }

  /** Get the current selection value. */
  public get selection(): Set<string> {
    return this._registry.get(this._selection);
  }

  /** Get the hasSelection atom for reactive access. */
  public get hasSelectionAtom(): Atom.Atom<boolean> {
    return this._hasSelection;
  }

  /** Check if there is any selection. */
  public get hasSelection(): boolean {
    return this._registry.get(this._hasSelection);
  }

  /** Get the allRowsSelected atom for reactive access. */
  public get allRowsSelectedAtom(): Atom.Atom<boolean> {
    return this._allSelected;
  }

  /** Check if all rows are selected. */
  public get allRowsSelected(): boolean {
    return this._registry.get(this._allSelected);
  }

  public get selectionMode(): SelectionMode {
    return this._selectionMode;
  }

  public getSelectedRows = (): T[] => {
    const selectedIds = this._registry.get(this._validSelectedIds);
    return this._registry.get(this._rows).filter((row) => selectedIds.has(row.id));
  };

  public isRowIndexSelected = (rowIndex: number): boolean => {
    const row = this._registry.get(this._rows)[rowIndex];
    return this._registry.get(this._selection).has(row.id);
  };

  public isObjectSelected = (object: T): boolean => {
    return this._registry.get(this._selection).has(object.id);
  };

  //
  // Manipulation
  //

  public toggleSelectionForRowIndex = (rowIndex: number): void => {
    const row = this._registry.get(this._rows)[rowIndex];
    const currentSelection = this._registry.get(this._selection);
    const newSelection = new Set(currentSelection);

    if (newSelection.has(row.id)) {
      newSelection.delete(row.id);
    } else {
      if (this._selectionMode === 'single') {
        newSelection.clear();
      }
      newSelection.add(row.id);
    }

    this._registry.set(this._selection, newSelection);
  };

  public setSelection = (mode: 'all' | 'none'): void => {
    switch (mode) {
      case 'all': {
        this._registry.set(this._selection, new Set(this._registry.get(this._rows).map((row) => row.id)));
        break;
      }
      case 'none': {
        this._registry.set(this._selection, new Set());
        break;
      }
    }
  };
}
