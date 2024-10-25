//
// Copyright 2024 DXOS.org
//

import { effect, type ReadonlySignal } from '@preact/signals-core';

import { type DxGridCellIndex } from '@dxos/react-ui-grid';

import { toGridCell, type GridCell } from '../types';

// TODO(burdon): Move into model.
//  TODO(burdon): This class is probably not necessary since we can subscribe to updates from ECHO directly.
// TODO(Zan): Take in the current visible bounds and only subscribe to cells within that range.

/**
 * CellUpdateListener monitors changes in table cell values.
 * It efficiently tracks updates across the table's data structure,
 * allowing for responsive UI updates and data synchronization.
 * The listener is designed to handle dynamic cell additions and removals,
 * making it suitable for tables with changing dimensions or content.
 */
export class CellUpdateListener {
  private cellEffectsUnsubscribes: (() => void)[] = [];
  private topLevelEffectUnsubscribe: (() => void) | null = null;

  constructor(
    private readonly cells: ReadonlySignal<{ [key: string]: any }>,
    private onCellUpdate?: (cell: GridCell) => void,
  ) {
    this.setupCellListeners();
    this.createInitialCellEffects();
  }

  public setOnCellUpdate = (onCellUpdate: (cell: GridCell) => void): void => {
    this.onCellUpdate = onCellUpdate;
  };

  private setupCellListeners = (): void => {
    this.topLevelEffectUnsubscribe = effect(() => {
      const cellsObj = this.cells.value;
      this.cleanupCellListeners();
      this.createCellEffects(cellsObj);
    });
  };

  private createInitialCellEffects = (): void => {
    this.createCellEffects(this.cells.value);
  };

  private createCellEffects = (cellsObj: { [key: string]: ReadonlySignal<any> }): void => {
    this.cellEffectsUnsubscribes = Object.entries(cellsObj).map(([key, cellSignal]) => {
      return effect(() => {
        cellSignal.value; // Access the value to subscribe to the signal.
        queueMicrotask(() => this.trackUpdate(key as DxGridCellIndex));
      });
    });
  };

  private cleanupCellListeners = (): void => {
    this.cellEffectsUnsubscribes.forEach((unsubscribe) => unsubscribe());
    this.cellEffectsUnsubscribes = [];
  };

  private trackUpdate = (cellIdx: DxGridCellIndex): void => {
    this.onCellUpdate?.(toGridCell(cellIdx));
  };

  // TODO(burdon): Implement Resource.
  public dispose = (): void => {
    this.cleanupCellListeners();
    if (this.topLevelEffectUnsubscribe) {
      this.topLevelEffectUnsubscribe();
      this.topLevelEffectUnsubscribe = null;
    }
  };
}
