//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { type Obj } from '@dxos/echo';

import { type ObjectCellSpec, type ResolvedCellProps } from './ModuleContainer';

/**
 * Grid-cell factories for the object-bound story layout cells — the only cells that need helper
 * construction, because they carry an ECHO object the container binds to its real plugin surface
 * (mirroring composer's `PlankComponent` dispatch) and derives an attendable id from. Cells that are
 * not object-bound are written directly in the layout as `AppSurface`/role tokens or `{ type, data }`
 * literals (the app-framework's own surface-dispatch vocabulary), so they need no factory here.
 */
export namespace Cell {
  type ArticleOptions = {
    component?: FC<ResolvedCellProps>;
    variant?: string;
    data?: Record<string, any>;
  };

  /** Object plank: dispatches the object's real Article surface (or `opts.component` if provided). */
  export const article = (object: Obj.Unknown, opts: ArticleOptions = {}): ObjectCellSpec => ({
    object,
    component: opts.component,
    data: {
      ...(opts.variant ? { variant: opts.variant } : {}),
      ...opts.data,
    },
  });

  /**
   * Object companion (e.g. `'history'`, `'comments'`): an Article surface keyed on `companionTo`.
   * `extra` carries surface data some companions require beyond the variant (e.g. an attention-linked
   * `variant` field), merged after the base fields so it cannot clobber `subject`/`companionTo`.
   */
  export const companion = (object: Obj.Unknown, variant: string, extra?: Record<string, any>): ObjectCellSpec => ({
    object,
    data: {
      ...extra,
      subject: variant,
      companionTo: object,
    },
  });
}
