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
export abstract class Projector<DATA, LAYOUT, OPTIONS extends ProjectorOptions> {
  public readonly updated = new EventEmitter<{ layout: LAYOUT }>();

  private readonly _options: OPTIONS;

  constructor(
    private readonly _context: SVGContext,
    options?: Partial<OPTIONS>,
  ) {
    this._options = Object.assign(
      {
        idAccessor: defaultIdAccessor,
      },
      options,
    ) as OPTIONS;
  }

  abstract get layout(): LAYOUT;

  get context(): SVGContext {
    return this._context;
  }

  get options(): OPTIONS {
    return this._options;
  }

  update(data?: DATA, selected?: string): void {
    this.onUpdate(data, selected);
  }

  async start(): Promise<void> {
    await this.onStart();
  }

  async stop(): Promise<void> {
    await this.onStop();
  }

  protected onUpdate(data?: DATA, selected?: string): void {}
  protected async onStart(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
