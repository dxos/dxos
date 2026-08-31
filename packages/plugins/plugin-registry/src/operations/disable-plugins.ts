//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';

import { DisablePlugins } from './definitions';

const handler: Operation.WithHandler<typeof DisablePlugins> = DisablePlugins.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ ids }) {
      const manager = yield* Plugin.Service;
      const installed = new Set(manager.getPlugins().map((plugin) => plugin.meta.profile.key));
      const core = new Set(manager.getCore());
      const before = new Set(manager.getEnabled());
      const rejected: { id: string; reason: string }[] = [];

      for (const id of ids) {
        if (!installed.has(id)) {
          rejected.push({ id, reason: 'Plugin is not installed on this host.' });
          continue;
        }

        // The manager reports a core disable as a silent no-op; the caller asked for it by name, so
        // surface the refusal instead.
        if (core.has(id)) {
          rejected.push({ id, reason: 'Core plugin cannot be disabled.' });
          continue;
        }

        // Already-disabled is not a failure: the call states the desired end state, so a caller
        // acting on a stale listing must not have to branch on it.
        if (!before.has(id)) {
          continue;
        }

        const result = yield* manager.disable(id).pipe(Effect.result);
        if (Result.isFailure(result)) {
          rejected.push({ id, reason: result.failure.message });
        }
      }

      // Diff the manager's set rather than echoing the request: disabling one plugin disables its
      // enabled dependents, and the caller needs to see everything that went off. Requested ids that
      // were already disabled are included too, so the reply states the end state the call asked for.
      const after = new Set(manager.getEnabled());
      const disabled = new Set([...before].filter((id) => !after.has(id)));
      const rejectedIds = new Set(rejected.map(({ id }) => id));
      for (const id of ids) {
        if (!before.has(id) && !rejectedIds.has(id)) {
          disabled.add(id);
        }
      }

      return {
        disabled: [...disabled],
        rejected,
      };
    }),
  ),
);

export default handler;
