//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { log } from '@dxos/log';

import { ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const schemasAtom = yield* Capability.atom(AppCapabilities.Schema);

    // TODO(wittjosiah): Unregister schemas when they are disabled.
    let previousDxns = new Set<string>();
    const cancel = registry.subscribe(
      schemasAtom,
      async (schemas) => {
        const seenSchemaDxns = new Set<string>();
        const batch: { schema: Type.AnyEntity; dxnKey: string }[] = [];
        for (const schema of schemas.flat()) {
          const uri = Type.getURI(schema);
          if (!uri) {
            log.warn('skipping schema without uri');
            continue;
          }

          const key = uri.toString();
          if (seenSchemaDxns.has(key)) {
            log('skipping duplicate schema for echo registration', { uri: key });
            continue;
          }

          seenSchemaDxns.add(key);
          batch.push({ schema, dxnKey: key });
        }

        const toRegister = batch.filter(({ dxnKey }) => !previousDxns.has(dxnKey));

        await client.addTypes(toRegister.map(({ schema }) => schema));
        for (const { dxnKey } of toRegister) {
          previousDxns.add(dxnKey);
        }
      },
      { immediate: true },
    );

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => cancel()));
  }),
);
