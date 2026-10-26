//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as UrlResolution from '@dxos/app-toolkit/UrlResolution';
import { type Space, SpaceMember_Role } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type buf } from '@dxos/protocols/buf';
import { isNonNullable } from '@dxos/util';

import { SpaceOperation } from '#types';

import { collectShareScope, encodeSharePayload } from '../util/index.ts';
import { getPluginsForTypenames } from '../util/share-plugins.ts';
import { SpaceOperationError } from './errors.ts';
import { SpaceOperationConfig } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.ShareObject> = SpaceOperation.ShareObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ object, access, role = 'editor' }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const builder = yield* Capability.get(AppCapabilities.AppGraph);
      const { shareableLinkOrigin } = yield* Capability.get(SpaceOperationConfig);
      const db = Obj.getDatabase(object);
      const space = db && client.spaces.get(db.spaceId);
      if (!space) {
        return yield* Effect.fail(new SpaceOperationError({ message: 'Only an object in a space can be shared.' }));
      }

      const path = UrlResolution.getShareableLinkPath(builder, GraphPath.getObjectPathFromObject(object));
      if (Option.isNone(path)) {
        return yield* Effect.fail(new SpaceOperationError({ message: 'The object has no URL to share.' }));
      }
      // The title lets the Composer Worker give the link a named preview in messengers.
      const url = UrlPath.withTitle(new URL(path.value, shareableLinkOrigin), Obj.getLabel(object));
      if (access === 'restricted') {
        return { url: url.toString(), objects: [object.id], plugins: [] };
      }

      const scope = yield* collectShareScope(object);
      // SpaceProxy waits for the properties object before it reports the space ready.
      const objects = [...new Set([...scope.map((entry) => entry.id), space.properties.id])];
      const manager = yield* Capability.get(Capabilities.PluginManager);
      const plugins = getPluginsForTypenames(
        manager,
        scope.map((entry) => Obj.getTypename(entry)).filter(isNonNullable),
      );
      const invitation = yield* createDelegatedInvitation(space, {
        role: role === 'viewer' ? SpaceMember_Role.READER : SpaceMember_Role.EDITOR,
        target: Obj.getURI(object),
        sharedObjectIds: objects,
      });
      url.searchParams.set(
        SpaceOperation.SHARE_PARAM,
        yield* encodeSharePayload({
          version: 1,
          spaceId: space.id,
          invitation,
          plugins,
          objects,
        }),
      );
      return { url: url.toString(), objects, plugins };
    }),
  ),
);
export default handler;

/**
 * Creates a delegated, multi-use invitation — written to the space's control feed, so EDGE redeems it with no member
 * online, and serves the shared objects to the link before its holder joins — and resolves with it as JSON once it is
 * live.
 */
const createDelegatedInvitation = (
  space: Space,
  { role, target, sharedObjectIds }: { role: SpaceMember_Role; target: string; sharedObjectIds: string[] },
): Effect.Effect<buf.JsonObject, SpaceOperationError> =>
  Effect.gen(function* () {
    const { InvitationEncoder, Invitation_AuthMethod, Invitation_State, Invitation_Type } = yield* Effect.promise(
      () => import('@dxos/client/invitations'),
    );
    const invitation = space.share({
      type: Invitation_Type.DELEGATED,
      authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
      multiUse: true,
      role,
      target,
      sharedObjectIds,
    });
    const failed = [
      Invitation_State.ERROR,
      Invitation_State.CANCELLED,
      Invitation_State.TIMEOUT,
      Invitation_State.EXPIRED,
    ];
    return yield* Effect.callback<buf.JsonObject, SpaceOperationError>((resume) => {
      const subscription = invitation.subscribe(
        (value) => {
          if (value.state === Invitation_State.CONNECTING) {
            resume(Effect.succeed(InvitationEncoder.toJson(value)));
          } else if (failed.includes(value.state)) {
            resume(Effect.fail(new SpaceOperationError({ message: 'Could not create the share invitation.' })));
          }
        },
        (cause) => resume(Effect.fail(new SpaceOperationError({ cause }))),
      );
      return Effect.sync(() => subscription.unsubscribe());
    });
  });
