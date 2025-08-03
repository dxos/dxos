//
// Copyright 2021 DXOS.org
//

import { type RefObject } from 'react';

import { invariant } from '@dxos/invariant';

import { type SVGContext } from '../../hooks';
import { type IdAccessor, defaultIdAccessor } from '../types';

export type RendererOptions<T = any> = {
  idAccessor: IdAccessor;
} & T;

/**
 * Base class for renderer that draw layouts.
 */
export abstract class Renderer<LAYOUT, OPTIONS extends RendererOptions> {
  protected readonly _options?: OPTIONS;

  constructor(
    protected readonly _context: SVGContext,
    protected readonly _root: RefObject<SVGGElement>,
    options?: Partial<OPTIONS>,
  ) {
    this._options = Object.assign(
      {
        idAccessor: defaultIdAccessor,
      },
      options,
    ) as OPTIONS;
  }

  get context(): SVGContext {
    return this._context;
  }

  get root(): SVGGElement {
    invariant(this._root.current, 'SVG root is not initialized');
    return this._root.current;
  }

  get options() {
    return this._options;
  }

  abstract render(layout: LAYOUT): void;
}
