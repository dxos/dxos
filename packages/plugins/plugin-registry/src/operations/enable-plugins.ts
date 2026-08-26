//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';

import { EnablePlugins } from './definitions';

const handler: Operation.WithHandler<typeof EnablePlugins> = EnablePlugins.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ ids }) {
      const manager = yield* Plugin.Service;
      const installed = new Set(manager.getPlugins().map((plugin) => plugin.meta.profile.key));
      const rejected: { id: string; reason: string }[] = [];

      for (const id of ids) {
        if (!installed.has(id)) {
          rejected.push({ id, reason: 'Plugin is not installed on this host.' });
          continue;
        }

        // Already-enabled is not a failure: the call states the desired end state, so a caller
        // acting on a stale listing must not have to branch on it.
        if (manager.getEnabled().includes(id)) {
          continue;
        }

        const result = yield* manager.enable(id).pipe(Effect.result);
        if (Result.isFailure(result)) {
          rejected.push({ id, reason: result.failure.message });
        }
      }

      // Report the manager's set rather than the requested ids: enabling one plugin enables its
      // dependency closure, and the caller needs to see what actually came on.
      const enabled = new Set(manager.getEnabled());
      return {
        enabled: ids.filter((id) => enabled.has(id)),
        rejected,
      };
    }),
  ),
);

export default handler;
