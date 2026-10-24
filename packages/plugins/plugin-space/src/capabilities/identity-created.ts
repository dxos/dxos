//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Annotation, Obj, Ref } from '@dxos/echo';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceCapabilities } from '#types';

/** Longest this identity's own spaces wait for the shared space, short of the module activation timeout. */
const SHARE_JOIN_WAIT = 15_000;

/** Resolves once the first space the identity lists, the one a share link joins, is ready, or after {@link SHARE_JOIN_WAIT}. */
const waitForSharedSpace = (client: Client): Effect.Effect<void> =>
  Effect.callback<Space>((resume) => {
    const subscription = client.spaces.subscribe((spaces) => {
      if (spaces.length > 0) {
        resume(Effect.succeed(spaces[0]));
      }
    });
    return Effect.sync(() => subscription.unsubscribe());
  }).pipe(
    Effect.flatMap((space) => Effect.tryPromise(() => space.waitUntilReady())),
    Effect.ignore,
    Effect.timeoutOrElse({ duration: SHARE_JOIN_WAIT, orElse: () => Effect.void }),
  );

type IdentityCreatedOptions = {
  /** The app booted to open a share link: the shared space opens first, as the guest is waiting on it. */
  shareBoot?: boolean;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ shareBoot = false }: IdentityCreatedOptions = {}) {
    const client = yield* ClientCapabilities.Client;

    // Both spaces would queue on the worker ahead of the join.
    if (shareBoot) {
      yield* waitForSharedSpace(client);
    }
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
