//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { useEffect, useState } from 'react';

import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { useComputeRuntime } from './useComputeRuntime';

type ResolvedService<T extends Context.Tag<any, any>> = Context.Tag.Service<T> | undefined;

/**
 * Resolves a service from the compute runtime for a given space.
 *
 * NOTE: Previously implemented via `use(useMemo(() => runtime.runPromiseExit(...)))`.
 * React's `use()` is weird and unreliable in production builds — the Suspense
 * boundary can stay pending indefinitely without the promise ever resolving
 * from React's perspective (the runtime is built lazily on first invocation
 * and one of its `acquire` steps can block). This `useState` + `useEffect`
 * flavour avoids suspension entirely: the hook returns `undefined` while the
 * service is being acquired or if acquisition fails / times out.
 */
export const useComputeRuntimeService = <T extends Context.Tag<any, any>>(
  tag: T,
  spaceId?: SpaceId,
): ResolvedService<T> => {
  const runtime = useComputeRuntime(spaceId);
  const [service, setService] = useState<ResolvedService<T>>(undefined);

  useEffect(() => {
    setService(undefined);
    if (!runtime) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const exit = await runtime.runPromiseExit(tag.pipe(Effect.timeout('30 seconds')));
        if (cancelled) {
          return;
        }
        if (Exit.isSuccess(exit)) {
          setService(exit.value);
        } else {
          log.warn('useComputeRuntimeService: failed to acquire service', { cause: exit.cause });
        }
      } catch (error) {
        if (!cancelled) {
          log.catch(error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runtime, tag]);

  return service;
};
