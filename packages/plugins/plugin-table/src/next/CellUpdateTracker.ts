//
// Copyright 2024 DXOS.org
//

import { effect, type ReadonlySignal } from '@preact/signals-core';

import { create } from '@dxos/echo-schema';

// TODO(Zan): Take in the current visible bounds and only subscribe to cells within that range.
export class CellUpdateTracker {
  public readonly updatedCells = create({ value: [] as string[] });
  private cellEffectsUnsubscribes: (() => void)[] = [];
  private topLevelEffectUnsubscribe: (() => void) | null = null;

  constructor(private readonly cells: ReadonlySignal<Map<any, any>>) {
    this.setupCellListeners();
    this.createInitialCellEffects();
  }

  private setupCellListeners = (): void => {
    this.topLevelEffectUnsubscribe = effect(() => {
      const cellsMap = this.cells.value;
      this.cleanupCellListeners();
      this.createCellEffects(cellsMap);
    });
  };

  private createInitialCellEffects = (): void => {
    this.createCellEffects(this.cells.value);
  };

  private createCellEffects = (cellsMap: Map<any, ReadonlySignal<any>>): void => {
    this.cellEffectsUnsubscribes = Array.from(cellsMap.entries()).map(([key, cellSignal]) => {
      return effect(() => {
        cellSignal.value; // Access the value to subscribe to the signal.
        queueMicrotask(() => this.trackUpdate(key));
      });
    });
  };

  private cleanupCellListeners = (): void => {
    this.cellEffectsUnsubscribes.forEach((unsubscribe) => unsubscribe());
    this.cellEffectsUnsubscribes = [];
  };

  public trackUpdate = (cellKey: string): void => {
    this.updatedCells.value.push(cellKey);
  };

  public clearUpdates = (): void => {
    this.updatedCells.value = [];
  };

  public dispose = (): void => {
    this.cleanupCellListeners();
    if (this.topLevelEffectUnsubscribe) {
      this.topLevelEffectUnsubscribe();
      this.topLevelEffectUnsubscribe = null;
    }
  };
}
