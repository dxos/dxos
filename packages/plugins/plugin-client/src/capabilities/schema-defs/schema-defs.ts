//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { type Type } from '@dxos/echo';

import { ClientCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);
    const schemasAtom = yield* Capability.atom(Common.Capability.Schema);

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

    return Capability.contributes(Common.Capability.Null, null, () => Effect.sync(() => cancel()));
  }),
);
