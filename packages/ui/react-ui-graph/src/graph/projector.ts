//
// Copyright 2021 DXOS.org
//

import { defaultIdAccessor, type IdAccessor } from './types';
import { type SVGContext } from '../hooks';
import { EventEmitter } from '../util';

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

  update(data?: NodeData, selected?: string) {
    this.onUpdate(data, selected);
  }

  async start() {
    await this.onStart();
  }

  async stop() {
    await this.onStop();
  }

  protected onUpdate(data?: NodeData, selected?: string): void {}
  protected async onStart(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
