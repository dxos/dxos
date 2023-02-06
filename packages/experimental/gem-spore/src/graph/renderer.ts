//
// Copyright 2021 DXOS.org
//

import { RefObject } from 'react';

import { SVGContext } from '@dxos/gem-core';

import { defaultIdAccessor, IdAccessor } from './types';

export type RendererOptions = {
  idAccessor: IdAccessor;
};

/**
 * Base class for renderer that draw layouts.
 */
export abstract class Renderer<LAYOUT, OPTIONS extends RendererOptions> {
  protected readonly _options?: OPTIONS;

  constructor(
    protected readonly _context: SVGContext,
    protected readonly _ref: RefObject<SVGGElement>,
    options?: Partial<OPTIONS>
  ) {
    this._options = Object.assign(
      {
        idAccessor: defaultIdAccessor
      },
      options
    ) as OPTIONS;
  }

  get context(): SVGContext {
    return this._context;
  }

  get root(): SVGGElement {
    return this._ref.current;
  }

  get options() {
    return this._options;
  }

  abstract update(layout: LAYOUT);
}
