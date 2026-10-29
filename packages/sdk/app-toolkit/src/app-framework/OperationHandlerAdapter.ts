//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Bare NSID of an operation key, so a `dxn:` key and its NSID compare equal. */
export const normalizeKey = (key: string): string => (DXN.isDXN(key) ? DXN.getName(key) : key);

/**
 * Compares the operation keys a module body's handler sets implement against the keys its config
 * declares. Read structurally so this headless module need not know the body's handler set types.
 */
export const diffOperations = (
  result: unknown,
  declared: readonly string[],
): { undeclared: string[]; unimplemented: string[] } => {
  const implemented = new Set(
    (Array.isArray(result) ? result : [result])
      .flatMap((contribution) =>
        isRecord(contribution) && contribution.capability === Capabilities.OperationHandler
          ? [contribution.values].flat()
          : [],
      )
      .filter(OperationHandlerSet.isOperationHandlerSet)
      .flatMap((set) => set.definitions().map((definition) => normalizeKey(definition.meta.key))),
  );
  const declaredKeys = new Set(declared.map(normalizeKey));
  return {
    undeclared: [...implemented].filter((key) => !declaredKeys.has(key)),
    unimplemented: [...declaredKeys].filter((key) => !implemented.has(key)),
  };
};

/**
 * Wraps an operation-handler module body so it reports, when it loads, any drift between the
 * operations its config declares and the ones it implements: the declared list is what the build
 * serializes, so an undeclared operation is invisible to anything reading the manifest.
 * Default export: a manifest loads adapters by URL, like module bodies.
 */
export default <P, A, E, R, M extends { default: (props: P) => Effect.Effect<A, E, R> }>(
  module: M & { default: (props: P) => Effect.Effect<A, E, R> },
  { operations }: { operations: readonly string[] },
) => ({
  ...module,
  default: (props: P) =>
    module.default(props).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          const { undeclared, unimplemented } = diffOperations(result, operations);
          if (undeclared.length > 0 || unimplemented.length > 0) {
            log.error('operation handler module drifts from its declared operations', { undeclared, unimplemented });
          }
        }),
      ),
    ),
});
