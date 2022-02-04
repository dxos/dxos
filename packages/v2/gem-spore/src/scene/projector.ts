//
// Copyright 2021 DXOS.org
//

import { EventEmitter, SvgContext } from '@dxos/gem-core';

import { RenderOptions } from './renderer';

/**
 * Generates a layout to be rendered.
 */
// TODO(burdon): Rename Layout?
export abstract class Projector<MODEL, LAYOUT, OPTIONS> {
  public readonly updated = new EventEmitter<{ layout: LAYOUT, options?: RenderOptions }>();

  constructor (
    private readonly _context: SvgContext,
    private readonly _mapper: (model: MODEL, layout: LAYOUT) => LAYOUT,
    private readonly _options?: OPTIONS
  ) {}

  get options (): OPTIONS {
    return this._options || {} as OPTIONS;
  }

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
