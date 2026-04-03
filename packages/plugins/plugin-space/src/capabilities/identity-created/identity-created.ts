//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { PERSONAL_SPACE_TAG, setPersonalSpace } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);

    const personalSpace = yield* Effect.tryPromise(() =>
      client.spaces.create({}, { tags: [PERSONAL_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED }),
    );
    yield* Effect.tryPromise(() => personalSpace.waitUntilReady());

    // Flag as personal space and create root collection structure.
    setPersonalSpace(personalSpace);
    yield* Effect.tryPromise(() => personalSpace.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
    Obj.change(personalSpace.properties, (properties) => {
      properties[Collection.Collection.typename] = Ref.make(Collection.make());
      if (Migrations.versionProperty) {
        properties[Migrations.versionProperty] = Migrations.targetVersion;
      }
    });
  }),
);
