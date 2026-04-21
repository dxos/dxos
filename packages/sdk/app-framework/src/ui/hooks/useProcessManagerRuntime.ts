//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { type DependencyList, use, useCallback, useMemo } from 'react';

import { unwrapExit } from '@dxos/effect';
import { ServiceResolver } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';

import { Capabilities } from '../../common';
import { useCapability } from './useCapabilities';

/**
 * Resolve the shared {@link Capabilities.ProcessManagerRuntime} from the plugin context.
 */
export const useProcessManagerRuntime = (): Capabilities.ProcessManagerRuntime =>
  useCapability(Capabilities.ProcessManagerRuntime);

/**
 * Build a callback that runs an effect on the {@link Capabilities.ProcessManagerRuntime}
 * with space-scoped services resolved via {@link ServiceResolver.provide}.
 *
 * The `tags` tuple must list every service the effect requires (beyond the
 * fixed {@link Capabilities.ProcessManagerRuntimeServices}); these services are
 * resolved for the given `spaceId` through the runtime's service resolver.
 */
export const useSpaceCallback = <const Tags extends readonly Context.Tag<any, any>[], T>(
  spaceId: SpaceId | undefined,
  tags: Tags,
  fn: () => Effect.Effect<T, any, Context.Tag.Identifier<Tags[number]> | Capabilities.ProcessManagerRuntimeServices>,
  deps?: DependencyList,
): (() => Promise<T>) => {
  const runtime = useProcessManagerRuntime();
  return useCallback(() => {
    if (spaceId === undefined) {
      throw new TypeError('Space not provided to useSpaceCallback');
    }
    const layer = ServiceResolver.provide({ space: spaceId }, ...tags);
    return runtime.runPromise(fn().pipe(Effect.provide(layer)) as Effect.Effect<T, any, any>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime, spaceId, ...(deps ?? [])]);
};

/**
 * Suspensefully resolve a single space-scoped service via the
 * {@link Capabilities.ProcessManagerRuntime}'s service resolver.
 */
export const useSpaceService = <T extends Context.Tag<any, any>>(
  tag: T,
  spaceId: SpaceId | undefined,
): Context.Tag.Service<T> | undefined => {
  const runtime = useProcessManagerRuntime();
  const promise = useMemo(() => {
    if (spaceId === undefined) {
      return undefined;
    }
    const layer = ServiceResolver.provide({ space: spaceId }, tag);
    const effect = Effect.flatMap(tag, (service) => Effect.succeed(service)).pipe(Effect.provide(layer));
    return runtime.runPromiseExit(effect as Effect.Effect<Context.Tag.Service<T>, any, any>);
  }, [runtime, spaceId, tag]);
  if (!promise) {
    return undefined;
  }
  return unwrapExit(use(promise));
};
