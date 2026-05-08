//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Type } from '@dxos/echo';
import { log } from '@dxos/log';

import { ClientCapabilities } from '#types';

const schemaKey = (schema: Type.AnyEntity) => `${Type.getTypename(schema)}@${Type.getVersion(schema)}`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const schemasAtom = yield* Capability.atom(AppCapabilities.Schema);

    // TODO(wittjosiah): Unregister schemas when they are disabled.
    let previousKeys = new Set<string>();
    const cancel = registry.subscribe(
      schemasAtom,
      async (_schemas: any[]) => {
        const schemas = Array.from(new Set(_schemas.flat())) as Type.AnyEntity[];
        const newSchemas = schemas.filter((schema) => !previousKeys.has(schemaKey(schema)));
        if (schemas.length !== newSchemas.length) {
          log('skipping duplicate schema registrations', { count: schemas.length - newSchemas.length });
        }
        previousKeys = new Set(schemas.map(schemaKey));
        await client.addTypes(newSchemas);
      },
      { immediate: true },
    );

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => cancel()));
  }),
);
