//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';

import { DetailedCellError } from '#hyperformula';
import { type ComputeGraph } from './compute-graph';
import { type CellAddress } from '../defs';
import { type CellScalarValue } from '../types';

/**
 * Individual "sheet" (typically corresponds to an ECHO object).
 */
// TODO(burdon): Factor out common HF wrapper from from SheetModel.
export class ComputeNode extends Resource {
  // TODO(burdon): Chaining events.
  public readonly update = new Event();

  constructor(
    private readonly _graph: ComputeGraph,
    public readonly sheetId: number,
  ) {
    super();
  }

  get graph() {
    return this._graph;
  }

  clear() {
    this._graph.hf.clearSheet(this.sheetId);
  }

  getValue(cell: CellAddress): CellScalarValue {
    const value = this._graph.hf.getCellValue({ sheet: this.sheetId, row: cell.row, col: cell.col });
    if (value instanceof DetailedCellError) {
      return null;
    }

    return value;
  }

  setValue(cell: CellAddress, value: CellScalarValue) {
    const mappedValue =
      typeof value === 'string' && value.charAt(0) === '=' ? this._graph.mapFormulaToNative(value) : value;
    this._graph.hf.setCellContents({ sheet: this.sheetId, row: cell.row, col: cell.col }, [[mappedValue]]);
  }

  protected override async _open() {
    // const unsubscribe = this._graph.update.on(this.update.emit);
    // this._ctx.onDispose(unsubscribe);
  }
}
