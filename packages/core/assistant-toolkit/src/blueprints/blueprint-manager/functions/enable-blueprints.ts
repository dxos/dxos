//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContextService } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { EnableBlueprints } from './definitions';

export default EnableBlueprints.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ keys }) {
      const registry = yield* Blueprint.RegistryService;
      const enabled: Blueprint.Blueprint[] = [];
      const rejected: { key: string; reason: string }[] = [];

      for (const key of keys) {
        const blueprint = registry.getByKey(key);
        if (!blueprint) {
          rejected.push({ key, reason: 'Blueprint not found in registry.' });
          continue;
        }
        if (!blueprint.agentCanEnable) {
          rejected.push({ key, reason: 'Blueprint does not allow agent auto-enable (agentCanEnable is not set).' });
          continue;
        }
        const dbBlueprint = yield* Blueprint.upsert(key).pipe(Effect.orDie);
        enabled.push(dbBlueprint);
      }

      if (enabled.length > 0) {
        yield* AiContextService.bindContext({
          blueprints: enabled.map(Ref.make),
        });
      }

      return { enabled, rejected };
    }),
  ),
);
