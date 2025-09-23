//
// Copyright 2024 DXOS.org
//

import { type Listeners, type ExportedCellChange } from '@dxos/vendor-hyperformula';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';

import { DetailedCellError } from '@dxos/vendor-hyperformula';

import { type ComputeGraph } from './compute-graph';
import { type CellAddress, type CellScalarValue, isFormula } from './types';

export type ComputeNodeEvent = {
  type: keyof Listeners;
  change?: ExportedCellChange;
};

/**
 * Individual "sheet" (typically corresponds to an ECHO object).
 */
// TODO(burdon): Factor out common HF wrapper from from SheetModel.
export class ComputeNode extends Resource {
  public readonly update = new Event<ComputeNodeEvent>();

  constructor(
    private readonly _graph: ComputeGraph,
    public readonly sheetId: number,
  ) {
    super();
  }

  get graph() {
    return this._graph;
  }

  clear(): void {
    this._graph.hf.clearSheet(this.sheetId);
  }

  getValue(cell: CellAddress): CellScalarValue {
    const value = this._graph.hf.getCellValue({ sheet: this.sheetId, row: cell.row, col: cell.col });
    if (value instanceof DetailedCellError) {
      return null;
    }

    return value;
  }

  setValue(cell: CellAddress, value: CellScalarValue): void {
    const mappedValue = isFormula(value) ? this._graph.mapFormulaToNative(value) : value;
    this._graph.hf.setCellContents({ sheet: this.sheetId, row: cell.row, col: cell.col }, [[mappedValue]]);
  }

  // TODO(burdon): Load data into sheet.
  protected override async _open(): Promise<void> {
    // const unsubscribe = this._graph.update.on(this.update.emit);
    // this._ctx.onDispose(unsubscribe);
  }
}
