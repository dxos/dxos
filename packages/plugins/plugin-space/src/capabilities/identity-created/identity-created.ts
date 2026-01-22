//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Collection } from '@dxos/schema';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

    const defaultSpace = client.spaces.default;
    yield* Effect.tryPromise(() => defaultSpace.waitUntilReady());

    // Create root collection structure.
    defaultSpace.properties[Collection.Collection.typename] = Ref.make(Collection.make());
    if (Migrations.versionProperty) {
      defaultSpace.properties[Migrations.versionProperty] = Migrations.targetVersion;
    }
  }),
);
