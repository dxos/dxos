//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation, Collection, Obj, Ref } from '@dxos/echo';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

import { PERSONAL_SPACE_NAME, ensureSettingsSpace } from '../settings-space';
import * as SpaceCapabilities from '../types/SpaceCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;

    // Created private (locked at genesis) but otherwise an ordinary space: it carries its own name
    // rather than a tag the rest of the app special-cases.
    const personalSpace = yield* Effect.tryPromise(() =>
      client.spaces.create({ name: PERSONAL_SPACE_NAME }, { membershipPolicy: MembershipPolicy.LOCKED }),
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

    // The cross-space ordering object is owned by `spaces-ready`, which also repairs it for
    // profiles that predate the settings space — creating it here too would race with that.
    const settingsSpace = yield* ensureSettingsSpace(client);
    AppSpace.setPersonalSpaceId(settingsSpace, personalSpace.id);

    return [
      Capability.contribute(SpaceCapabilities.PersonalSpace, personalSpace),
      Capability.contribute(SpaceCapabilities.SettingsSpace, settingsSpace),
    ];
  }),
);
