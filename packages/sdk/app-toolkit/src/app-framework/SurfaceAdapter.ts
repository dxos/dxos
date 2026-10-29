//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { log } from '@dxos/log';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * The roles the surfaces in a module body's result bind that `declared` omits. Read structurally -
 * a contribution's `values`, and the `role` (one or several) `Surface.create` resolves from each
 * definition's filter - so this headless module need not load React's `Surface`.
 */
export const undeclaredSurfaceRoles = (result: unknown, declared: readonly string[]): string[] => {
  const bound = (Array.isArray(result) ? result : [result])
    .flatMap((contribution) =>
      isRecord(contribution) &&
      contribution.capability === Capabilities.ReactSurface &&
      Array.isArray(contribution.values)
        ? contribution.values
        : [],
    )
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .flatMap((surface) => (isRecord(surface) ? [surface.role].flat() : []))
    .filter((role): role is string => typeof role === 'string');
  return [...new Set(bound)].filter((role) => !declared.includes(role));
};

/**
 * Wraps a surface module body so it reports, when it loads, any role its surfaces bind but do not
 * declare: a request for only that role never loads the module, so the surface silently renders
 * nothing wherever no declared role was requested first.
 * Default export: a manifest loads adapters by URL, like module bodies. Keeps the body's other exports,
 * where hot replacement finds its key.
 */
export default <P, A, E, R, M extends { default: (props: P) => Effect.Effect<A, E, R> }>(
  module: M & { default: (props: P) => Effect.Effect<A, E, R> },
  { roles }: { roles: readonly string[] },
) => ({
  ...module,
  default: (props: P) =>
    module.default(props).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          const undeclared = undeclaredSurfaceRoles(result, roles);
          if (undeclared.length > 0) {
            log.error('surface module binds roles missing from its declared roles', { undeclared, roles });
          }
        }),
      ),
    ),
});
