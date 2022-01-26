//
// Copyright 2021 DXOS.org
//

import { EventEmitter, EventHandle } from '@dxos/gem-core';

export type ObjectId = string

// TODO(burdon): Add bounds, zoom, etc.
export class Surface {
  constructor (
    readonly svg: SVGSVGElement,
    readonly root: SVGGElement
  ) {}
}

//
// Projector => Layout => Renderer
//

export interface RenderOptions {
  drag?: any
}

export abstract class Renderer<LAYOUT> {
  constructor (
    protected readonly _surface: Surface
  ) {}

  abstract update (layout: LAYOUT, options?: RenderOptions);
}

export abstract class Projector<MODEL, LAYOUT> {
  readonly updateEvent = new EventEmitter<{ layout: LAYOUT, options?: RenderOptions }>();

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

export class Part<MODEL, LAYOUT> {
  _updateListener: EventHandle | undefined;

  constructor (
    private readonly _projector: Projector<MODEL, LAYOUT>,
    private readonly _renderer: Renderer<LAYOUT>
  ) {}

  update (model: MODEL) {
    this._projector.update(model);
  }

  start () {
    this._updateListener = this._projector.updateEvent.on(({ layout, options }) => {
      this._renderer.update(layout, options);
    });

    this._projector.start();
  }

  async stop () {
    await this._projector.stop();

    this._updateListener?.off();
    this._updateListener = undefined;
  }
}

export class Scene<MODEL> {
  constructor (
    private readonly _parts: Part<MODEL, any>[]
  ) {}

  update (model: MODEL) {
    this._parts.forEach(part => part.update(model));
  }

  start () {
    this._parts.forEach(part => part.start());
  }

  stop () {
    return Promise.all(this._parts.map(part => part.stop()));
  }
}
