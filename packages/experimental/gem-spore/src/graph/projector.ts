//
// Copyright 2021 DXOS.org
//

import { EventEmitter, SVGContext } from '@dxos/gem-core';

import { defaultIdAccessor, IdAccessor } from '../graph';

export type ProjectorOptions = {
  idAccessor?: IdAccessor;
};

/**
 * Generates a layout to be rendered.
 */
export abstract class Projector<DATA, LAYOUT, OPTIONS extends ProjectorOptions> {
  public readonly updated = new EventEmitter<{ layout: LAYOUT }>();

  private readonly _options?: OPTIONS;

  // prettier-ignore
  constructor(
    private readonly _context: SVGContext,
    options?: OPTIONS
  ) {
    this._options = Object.assign(
      {
        idAccessor: defaultIdAccessor
      },
      options
    );
  }

  abstract get layout(): LAYOUT;

  get context(): SVGContext {
    return this._context;
  }

  get options(): OPTIONS {
    return this._options || ({} as OPTIONS);
  }

  update(data?: DATA, selected?: string) {
    this.onUpdate(data, selected);
  }

  async start() {
    await this.onStart();
  }

  async stop() {
    await this.onStop();
  }

  protected onUpdate(data?: DATA, selected?: string): void {}
  protected async onStart(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
