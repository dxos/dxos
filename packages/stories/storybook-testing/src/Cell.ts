//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { type Role } from '@dxos/app-framework';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type Obj } from '@dxos/echo';

import { type ObjectCellSpec, type ResolvedCellProps } from './ModuleContainer';

/**
 * Grid-cell factories for a story layout. Each returns a `ModuleSpec` the container renders as a
 * real plugin surface bound to a concrete object (mirroring composer's `PlankComponent` dispatch),
 * or as a raw role-token surface for panels that are not object-bound.
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
      ...(opts.variant
        ? {
            variant: opts.variant,
          }
        : {}),
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

  /** Space-scoped deck companion (e.g. `'trace'`) whose surface reads `useActiveSpace()`. */
  export const deckCompanion = (
    variant: string,
  ): {
    type: Role.Role<any>;
    data: Record<string, any>;
  } => ({
    type: AppSurface.deckCompanion(variant),
    data: {},
  });

  /** Raw role-token surface for panels that are not object-bound (custom story roles). */
  export const surface = (
    token: Role.Role<any>,
    data?: Record<string, any>,
    id?: string,
  ): {
    type: Role.Role<any>;
    data?: Record<string, any>;
    id?: string;
  } => ({
    type: token,
    data,
    id,
  });
}
