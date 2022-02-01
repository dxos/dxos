//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from '@dxos/gem-core';

import { RenderOptions } from './renderer';

/**
 * Generates a layout to be rendered.
 */
export abstract class Projector<MODEL, LAYOUT> {
  readonly updated = new EventEmitter<{ layout: LAYOUT, options?: RenderOptions }>();

  constructor (
    private readonly _mapper: (model: MODEL, layout: LAYOUT) => LAYOUT
  ) {}

  update (model: MODEL) {
    this.onUpdate(this._mapper(model, this.getLayout()));
  }

  start () {
    this.onStart();
  }

  async stop () {
    await this.onStop();
  }

  protected abstract getLayout (): LAYOUT;

  protected abstract onUpdate (layout: LAYOUT);

  protected onStart () {}

  protected async onStop () {}
}
