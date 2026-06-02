//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { PERSONAL_SPACE_TAG, RootCollectionAnnotation } from '@dxos/app-toolkit';
import { Annotation, Collection, Ref } from '@dxos/echo';
import { MigrationVersionAnnotation, Migrations } from '@dxos/migrations';
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

    // Create root collection structure.
    yield* Effect.tryPromise(() => personalSpace.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
    Annotation.set(personalSpace.properties, RootCollectionAnnotation, Ref.make(Collection.make()));
    if (Migrations.targetVersion) {
      Annotation.set(personalSpace.properties, MigrationVersionAnnotation, Migrations.targetVersion);
    }
  }),
);
