//
// Copyright 2021 DXOS.org
//

import { type RefObject } from 'react';

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

  /**
   * Returns the SVG group root if mounted.
   * The ref may be null between mount/unmount cycles or before the SVG container has sized.
   * Callers should treat null as "skip this render" rather than as an error.
   */
  get root(): SVGGElement | null {
    return this._root.current;
  }

  get options() {
    return this._options;
  }

  abstract render(layout: LAYOUT): void;

  /**
   * Fast path invoked when only positions changed.
   * Default falls back to a full `render`; subclasses can override to skip
   * enter/exit joins and attribute callbacks for per-tick updates.
   */
  applyPositions(layout: LAYOUT): void {
    this.render(layout);
  }
}
