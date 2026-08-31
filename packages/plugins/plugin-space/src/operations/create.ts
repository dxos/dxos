// Copyright 2025 DXOS.org

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { hues } from '@dxos/ui-types';
import { iconValues } from '@dxos/ui-types';

import { SpaceCapabilities, SpaceEvents, SpaceOperation } from '#types';

import { SpaceNotReadyError } from '../errors';

/** Bounds how long space creation waits for the new space's properties object to become available. */
const SPACE_READY_TIMEOUT = Duration.seconds(10);

const handler: Operation.WithHandler<typeof SpaceOperation.Create> = SpaceOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, hue: hue_, icon: icon_, private: isPrivate, edgeReplication }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const hue = hue_ ?? hues[Math.floor(Math.random() * hues.length)];
      const icon = icon_ ?? iconValues[Math.floor(Math.random() * iconValues.length)];
      const space = yield* Effect.promise(() =>
        client.spaces.create(
          {
            name,
            hue,
            icon,
          },
          // Membership policy is written into the genesis credential and cannot be changed later.
          { membershipPolicy: isPrivate ? MembershipPolicy.LOCKED : MembershipPolicy.INVITE },
        ),
      );
      if (edgeReplication) {
        // Best-effort, and deliberately not fatal: the preference is committed on the host and
        // converges on its own, so only the local snapshot can fail here — and failing the operation
        // on that discards a space that already exists.
        yield* Effect.tryPromise(() =>
          space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED),
        ).pipe(Effect.catch((error) => Effect.sync(() => log.catch(error))));
      }
      yield* Effect.tryPromise({
        try: () => space.waitUntilReady(),
        catch: SpaceNotReadyError.wrap(),
      }).pipe(
        Effect.timeoutOrElse({ duration: SPACE_READY_TIMEOUT, orElse: () => Effect.fail(new SpaceNotReadyError()) }),
      );

      const collection = Obj.make(Collection.Collection, { objects: [] });
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(collection));
        if (Migrations.targetVersion) {
          Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion);
        }
      });

      yield* Plugin.activate(SpaceEvents.SpaceCreated);
      const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
      yield* Effect.all(
        onCreateSpaceCallbacks.map((onCreateSpace) =>
          onCreateSpace({ space, isDefault: false, rootCollection: collection }),
        ),
      );

      return { id: space.id, subject: [space.id], space };
    }),
  ),
);
export default handler;
