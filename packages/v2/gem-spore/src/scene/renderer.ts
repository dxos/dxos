//
// Copyright 2021 DXOS.org
//

import { RefObject } from 'react';

import { D3Callable } from '@dxos/gem-core';

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
    protected readonly _ref: RefObject<SVGGElement>,
    protected readonly _options?: OPTIONS
  ) {}

  get root (): SVGGElement {
    return this._ref.current;
  }

  get options () {
    return this._options || {} as OPTIONS;
  }

  abstract update (layout: LAYOUT, options?: RenderOptions);
}
