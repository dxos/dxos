//
// Copyright 2021 DXOS.org
//

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

export interface Renderer<LAYOUT> {
  update: (surface: Surface, layout: LAYOUT) => void
  clear: (surface: Surface) => void
}

export interface Projector<MODEL> {
  update: (model: any) => void
  start?: (surface: Surface) => void
  stop?: () => Promise<void>
}

export abstract class BaseProjector<MODEL, LAYOUT> implements Projector<MODEL> {
  private _surface: Surface;

  constructor (
    private readonly _mapper: (model: MODEL, layout: LAYOUT) => LAYOUT,
    private readonly _renderer: Renderer<LAYOUT>
  ) {}

  update (model: MODEL) {
    this.onUpdate(this._mapper(model, this.getLayout()));
    this.doUpdate();
  }

  start (surface: Surface) {
    this._surface = surface;
    this.onStart();
  }

  async stop () {
    await this.onStop();
    this._renderer.clear(this._surface);
    this._surface = undefined;
  }

  protected abstract getLayout (): LAYOUT;

  protected abstract onUpdate (layout: LAYOUT);

  protected abstract onStart ();

  protected async onStop () {}

  protected doUpdate () {
    this._renderer.update(this._surface, this.getLayout());
  }
}

export class Scene<MODEL> {
  constructor (
    private readonly _projectors: BaseProjector<MODEL, any>[]
  ) {}

  update (model: MODEL) {
    this._projectors.forEach(projector => projector.update(model));
  }

  start (surface: Surface) {
    this._projectors.forEach(projector => projector.start(surface));
  }

  stop () {
    return Promise.all(this._projectors.map(projector => projector.stop()));
  }
}
