//
// Copyright 2021 DXOS.org
//

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

// TODO(burdon): Use generics.
export interface RenderOptions {
  drag?: any
}

/**
 * Base class for renderes that draw layouts.
 */
export abstract class Renderer<LAYOUT> {
  constructor (
    protected readonly _surface: Surface
  ) {}

  abstract update (layout: LAYOUT, options?: RenderOptions);
}
