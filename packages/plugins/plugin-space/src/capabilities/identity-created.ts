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

import { SpaceCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;

    const { defaultSpace } = yield* AppSpace.setupIdentitySpaces(client);
    // Boot-waterfall milestone: the default space is usable from here (first-run path).
    performance.mark('milestone:default-space-ready');

    // Create root collection structure.
    Obj.update(defaultSpace.properties, (properties) => {
      Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(Collection.make()));
      if (Migrations.targetVersion) {
        Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion);
      }
    });

    return Capability.contribute(SpaceCapabilities.DefaultSpace, defaultSpace);
  }),
);
