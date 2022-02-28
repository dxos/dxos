//
// Copyright 2021 DXOS.org
//

import { RefObject } from 'react';

import { SVGContext } from '@dxos/gem-core';

/**
 * Base class for renderes that draw layouts.
 */
export abstract class Renderer<LAYOUT, OPTIONS> {
  constructor (
    protected readonly _context: SVGContext,
    protected readonly _ref: RefObject<SVGGElement>,
    protected readonly _options?: OPTIONS
  ) {}

  get context (): SVGContext {
    return this._context;
  }

  get root (): SVGGElement {
    return this._ref.current;
  }

  get options () {
    return this._options || {} as OPTIONS;
  }

  abstract update (layout: LAYOUT);
}
