//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation, Collection, Obj, Ref } from '@dxos/echo';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { SpaceCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;

    const personalSpace = yield* Effect.tryPromise(() =>
      client.spaces.create({}, { tags: [AppSpace.PERSONAL_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED }),
    );
    yield* Effect.tryPromise(() => personalSpace.waitUntilReady());
    // Boot-waterfall milestone: the default space is usable from here (first-run path).
    performance.mark('milestone:default-space-ready');

    // Create root collection structure.
    yield* Effect.tryPromise(() => personalSpace.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
    Obj.update(personalSpace.properties, (properties) => {
      Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(Collection.make()));
      if (Migrations.targetVersion) {
        Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion);
      }
    });

    return Capability.contribute(SpaceCapabilities.PersonalSpace, personalSpace);
  }),
);
