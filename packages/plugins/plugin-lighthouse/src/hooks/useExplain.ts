//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useRef, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';

import { type ExplainNode, type LighthouseClient } from '#client';

/** New events arrive in bursts; a refresh waits for them to settle. */
const SETTLE_MS = 800;

/**
 * The session's trace (`GET /sessions/:run/explain`), read when the run changes and again, after the burst
 * settles, each time `version` does (pass the stream's last seq to follow a live session).
 */
export const useExplain = (client: LighthouseClient | undefined, run: string | undefined, version?: number) => {
  const [tree, setTree] = useState<ExplainNode>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Read by the fetch effect to pick its delay, without making the tree one of its triggers.
  const loaded = useRef(false);

  useEffect(() => {
    loaded.current = false;
    setTree(undefined);
    setError(undefined);
  }, [client, run]);

  useEffect(() => {
    if (!client || !run) {
      return;
    }
    let live = true;
    setLoading(true);
    const timer = setTimeout(
      () =>
        void EffectEx.runPromise(
          client.explain(run).pipe(
            Effect.match({
              onSuccess: (tree) => ({ tree, error: undefined }),
              onFailure: (failure) => ({ tree: undefined, error: failure.message }),
            }),
          ),
        ).then((result) => {
          if (!live) {
            return;
          }
          setLoading(false);
          setError(result.error);
          if (result.tree) {
            loaded.current = true;
            setTree(result.tree);
          }
        }),
      loaded.current ? SETTLE_MS : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [client, run, version, nonce]);

  const refresh = useCallback(() => setNonce((nonce) => nonce + 1), []);
  return { tree, error, loading, refresh };
};
