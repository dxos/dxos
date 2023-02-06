//
// Copyright 2021 DXOS.org
//

import { EventEmitter, SVGContext } from '@dxos/gem-core';

/**
 * Generates a layout to be rendered.
 */
export abstract class Projector<DATA, LAYOUT, OPTIONS> {
  public readonly updated = new EventEmitter<{ layout: LAYOUT }>();

  // prettier-ignore
  constructor(
    private readonly _context: SVGContext,
    private readonly _options?: OPTIONS
  ) {}

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
