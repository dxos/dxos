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
      const before = new Set(manager.getEnabled());
      const rejected: { id: string; reason: string }[] = [];

      for (const id of ids) {
        if (!installed.has(id)) {
          rejected.push({ id, reason: 'Plugin is not installed on this host.' });
          continue;
        }

        // Already-enabled is not a failure: the call states the desired end state, so a caller
        // acting on a stale listing must not have to branch on it.
        if (before.has(id)) {
          continue;
        }

        const result = yield* manager.enable(id).pipe(Effect.result);
        if (Result.isFailure(result)) {
          rejected.push({ id, reason: result.failure.message });
        }
      }

      // Diff the manager's set rather than echoing the request: enabling one plugin enables its
      // dependency closure, and the caller needs to see everything that came on. Requested ids that
      // were already enabled are included too, so the reply states the end state the call asked for.
      const enabled = new Set(manager.getEnabled().filter((id) => !before.has(id)));
      for (const id of ids) {
        if (before.has(id)) {
          enabled.add(id);
        }
      }

      return {
        enabled: [...enabled],
        rejected,
      };
    }),
  ),
);

export default handler;
