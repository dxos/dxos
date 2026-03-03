//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Type } from '@dxos/echo';

import { ClientCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const schemasAtom = yield* Capability.atom(AppCapabilities.Schema);

    // TODO(wittjosiah): Unregister schemas when they are disabled.
    let previous: Type.Entity.Any[] = [];
    const cancel = registry.subscribe(
      schemasAtom,
      async (_schemas: any[]) => {
        // TODO(wittjosiah): This doesn't seem to de-dupe schemas as expected.
        const schemas = Array.from(new Set(_schemas.flat())) as Type.Entity.Any[];
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
