//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation, Obj, Ref } from '@dxos/echo';
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
      Annotation.set(
        properties,
        AppAnnotation.RootCollectionAnnotation,
        Ref.make(AppAnnotation.addRootCollection(defaultSpace.db)),
      );
      if (Migrations.targetVersion) {
        Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion);
      }
    });

    // Settings sync may have named its own object already: it also runs on this event, and replacing its object
    // would orphan whatever it wrote there.
    if (Option.isNone(Annotation.get(settingsSpace.properties, AppAnnotation.AppSettingsAnnotation))) {
      Obj.update(settingsSpace.properties, (properties) => {
        Annotation.set(
          properties,
          AppAnnotation.AppSettingsAnnotation,
          Ref.make(settingsSpace.db.add(AppSettings.make())),
        );
      });
    }

    return Capability.contribute(SpaceCapabilities.DefaultSpace, defaultSpace);
  }),
);
