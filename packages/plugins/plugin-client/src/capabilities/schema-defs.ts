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
    let previous: Type.AnyEntity[] = [];
    const cancel = registry.subscribe(
      schemasAtom,
      async (_schemas) => {
        const seenSchemaDxns = new Set<string>();
        const schemas: Type.AnyEntity[] = [];
        for (const schema of _schemas.flat()) {
          const dxn = Type.getDXN(schema);
          if (!dxn) {
            log.warn('skipping schema without dxn');
            continue;
          }

          const key = dxn.toString();
          if (seenSchemaDxns.has(key)) {
            log.warn('skipping duplicate schema for echo registration', { dxn: key });
            continue;
          }

          seenSchemaDxns.add(key);
          schemas.push(schema);
        }

        // TODO(wittjosiah): Filter out schemas which the client has already registered.
        const newSchemas = schemas.filter((schema) => !previous.includes(schema));
        previous = schemas;
        await client.addTypes(newSchemas);
      },
      { immediate: true },
    );

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => cancel()));
  }),
);
