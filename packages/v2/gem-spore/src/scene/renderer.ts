//
// Copyright 2021 DXOS.org
//

import { D3Callable } from '../util';

/**
 * SVG container.
 */
export class Surface {
  constructor (
    // TODO(burdon): SvgContext?
    readonly svg: SVGSVGElement,
    readonly root: SVGGElement
  ) {}
}

/**
 * Generic options created by projector.
 */
export interface RenderOptions {
  drag?: D3Callable
}

/**
 * Base class for renderes that draw layouts.
 */
export abstract class Renderer<LAYOUT, OPTIONS> {
  constructor (
    protected readonly _surface: Surface,
    protected readonly _options?: OPTIONS
  ) {}

  get options () {
    return this._options || {} as OPTIONS;
  }

  abstract update (layout: LAYOUT, options?: RenderOptions);
}
