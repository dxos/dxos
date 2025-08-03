//
// Copyright 2021 DXOS.org
//

import { type SVGContext } from '../../hooks';
import { EventEmitter } from '../../util';
import { type IdAccessor, defaultIdAccessor } from '../types';

export type ProjectorOptions = {
  idAccessor?: IdAccessor;
};

/**
 * Generates a layout to be rendered.
 */
export abstract class Projector<NodeData, Layout, Options extends ProjectorOptions> {
  public readonly updated = new EventEmitter<{ layout: Layout }>();

  private readonly _options: Options;

  constructor(
    private readonly _context: SVGContext,
    options?: Partial<Options>,
  ) {
    this._options = Object.assign(
      {
        idAccessor: defaultIdAccessor,
      },
      options,
    ) as Options;
  }

  abstract get layout(): Layout;

  get context(): SVGContext {
    return this._context;
  }

  get options(): Options {
    return this._options;
  }

  refresh(dragging = false) {
    this.onRefresh(dragging);
  }

  updateData(data?: NodeData) {
    this.onUpdate(data);
  }

  emitUpdate() {
    this.updated.emit({ layout: this.layout });
  }

  async clear() {
    await this.onClear();
  }

  async start() {
    await this.onStart();
  }

  async stop() {
    await this.onStop();
  }

  protected onRefresh(dragging = false): void {}
  protected onUpdate(data?: NodeData): void {}
  protected async onClear(): Promise<void> {}
  protected async onStart(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
