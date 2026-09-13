//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation, Collection, Database, Obj, Ref } from '@dxos/echo';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;

    const { defaultSpace, settingsSpace } = yield* AppSpace.setupIdentitySpaces(client);
    // Boot-waterfall milestone: the default space is usable from here (first-run path).
    performance.mark('milestone:default-space-ready');

    // Create root collection structure.
    Obj.update(defaultSpace.properties, (properties) => {
      Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(Collection.make()));
      if (Migrations.targetVersion) {
        Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion);
      }
    });

    // Created here for the same reason as the root collection: genesis runs on one device, so every
    // other receives the object by replication rather than racing to create its own.
    yield* AppSettings.open().pipe(Effect.provide(Database.layer(settingsSpace.db)));

    return Capability.contribute(SpaceCapabilities.DefaultSpace, defaultSpace);
  }),
);
