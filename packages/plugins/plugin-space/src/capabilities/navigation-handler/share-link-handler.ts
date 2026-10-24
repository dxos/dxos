//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Client } from '@dxos/client';
import { INITIALIZE_TIMEOUT } from '@dxos/client-protocol';
import { type Space } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { SpaceOperationError } from '../../operations/errors.ts';
import { type SharePayload, decodeSharePayload } from '../../util/index.ts';

/** How long a fresh browser may take to create its identity (onboarding does that for a share link). */
const IDENTITY_TIMEOUT = 60_000;

/** How long a member waits for the host to widen a partially replicated space's scope. */
const EXTEND_TIMEOUT = 5_000;

/** How long a background join may take to produce a ready space before it gives up and says so. */
const SPACE_TIMEOUT = 180_000;

/**
 * Opens an object share link (`?share=`): turns on the plugins it names, then — for a member — extends a partial space's sync scope and leaves the path to URL projection; for anyone
 * else, joins the space in the background replicating only the shared objects, then opens the object.
 */
export const handleShareLink = (url: URL): Effect.Effect<void, never, Capability.Service | Operation.Service> =>
  Effect.gen(function* () {
    const encoded = url.searchParams.get(SpaceOperation.SHARE_PARAM);
    if (!encoded) {
      return;
    }

    const payload = yield* decodeSharePayload(encoded);
    const spaceId = payload.spaceId;
    if (!SpaceId.isValid(spaceId)) {
      return yield* Effect.fail(new SpaceOperationError({ message: 'The link names no valid space.' }));
    }
    yield* enablePlugins(payload.plugins);

    const client = yield* Capability.get(ClientCapabilities.Client);
    yield* Effect.tryPromise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));
    yield* waitForIdentity(client).pipe(Effect.timeout(IDENTITY_TIMEOUT));
    // Kept until now: onboarding reads it from the address bar, after this handler starts, to create the identity.
    removeQueryParam(SpaceOperation.SHARE_PARAM);

    const existing = client.spaces.get(spaceId);
    if (existing) {
      // A member who joined through another link replicates only that link's objects; a full member is unaffected.
      yield* Effect.tryPromise(() => existing.internal.extendSyncScope(payload.objects)).pipe(
        Effect.timeout(EXTEND_TIMEOUT),
        Effect.catch((error) => Effect.sync(() => log.warn('sync scope not extended', { spaceId, error }))),
      );
      return;
    }

    const invitation = payload.invitation;
    if (!invitation) {
      return yield* Effect.fail(new SpaceOperationError({ message: 'The link is only for members of its space.' }));
    }
    yield* Operation.invoke(LayoutOperation.AddToast, {
      id: `${meta.profile.key}/share-link-opening`,
      icon: 'ph--share-network--regular',
      title: ['share-link-opening.title', { ns: meta.profile.key }],
      duration: 15_000,
    });
    // Detached: URL projection waits on every handler, and the app should render while the join runs.
    yield* Effect.forkDetach(preloadArticleSurfaces);
    yield* Effect.forkDetach(joinAndOpen(client, invitation, spaceId, payload).pipe(Effect.catch(reportFailure)));
  }).pipe(Effect.catch(reportFailure));

const reportFailure = (error: unknown): Effect.Effect<void, never, Operation.Service> =>
  Effect.gen(function* () {
    log.warn('share link not opened', { error });
    yield* Operation.invoke(LayoutOperation.AddToast, {
      id: `${meta.profile.key}/share-link-failed`,
      icon: 'ph--warning--regular',
      title: ['share-link-failed.title', { ns: meta.profile.key }],
      description: error instanceof Error ? error.message : String(error),
    }).pipe(Effect.ignore);
  });

/** Turns on the link's plugins that this build has and has not enabled; an unknown id is skipped. */
const enablePlugins = Effect.fnUntraced(function* (ids: readonly string[]) {
  const manager = yield* Capability.get(Capabilities.PluginManager);
  const installed = new Set(manager.getPlugins().map((plugin) => plugin.meta.profile.key));
  const enabled = new Set(manager.getEnabled());
  for (const id of ids.filter((id) => installed.has(id) && !enabled.has(id))) {
    yield* manager
      .enable(id)
      .pipe(Effect.catch((error) => Effect.sync(() => log.warn('plugin not enabled', { id, error }))));
  }
});

/**
 * Loads the code an opened object renders with while the join leaves the page idle, rather than once the object
 * opens and its plank first asks for it.
 */
const preloadArticleSurfaces: Effect.Effect<void, never, Capability.Service> = Effect.gen(function* () {
  const manager = yield* Capability.get(Capabilities.PluginManager);
  yield* manager.activate(ActivationEvents.SurfacesRequested(AppSurface.Article.role));
}).pipe(Effect.catch((error) => Effect.sync(() => log.warn('article surfaces not preloaded', { error }))));

/** Resolves once the client has an identity; a fresh browser gets one from onboarding. */
const waitForIdentity = (client: Client): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    if (client.halo.identity.get()) {
      resume(Effect.void);
      return;
    }
    const subscription = client.halo.identity.subscribe((identity) => {
      if (identity) {
        resume(Effect.void);
      }
    });
    return Effect.sync(() => subscription.unsubscribe());
  });

/**
 * Joins with the link's scope and no dialog, and opens the shared object once the space is listed, so its plank loads
 * while the space finishes opening. The space appearing is the success signal: the invitation reports a failed attempt
 * (EDGE refusing, a host timing out) while another path still goes on to admit the guest.
 */
const joinAndOpen = (
  client: Client,
  code: string,
  spaceId: SpaceId,
  payload: SharePayload,
): Effect.Effect<void, SpaceOperationError, Operation.Service> =>
  Effect.gen(function* () {
    const { InvitationEncoder } = yield* Effect.promise(() => import('@dxos/client/invitations'));
    const decoded = yield* Effect.try({
      try: () => InvitationEncoder.decode(code),
      catch: (cause) => new SpaceOperationError({ cause }),
    });
    const invitation = client.spaces.join(decoded, { syncScope: { objectIds: payload.objects } });
    const subscription = invitation.subscribe(
      (value) => log('share link invitation', { state: value.state }),
      (error) => log('share link invitation attempt failed', { error }),
    );

    yield* Effect.gen(function* () {
      const space = yield* waitForSpace(client, spaceId);
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [GraphPath.getObjectPath(space.id, payload.typeSlug, payload.objectId)],
        workspace: GraphPath.getSpacePath(space.id),
        navigation: 'immediate',
      });
      yield* Effect.tryPromise(() => space.waitUntilReady());
    }).pipe(
      Effect.timeout(SPACE_TIMEOUT),
      Effect.mapError((cause) => new SpaceOperationError({ message: 'The shared space did not open.', cause })),
      Effect.ensuring(Effect.sync(() => subscription.unsubscribe())),
    );
  });

/** The space once the client lists it, which trails the invitation's success. */
const waitForSpace = (client: Client, spaceId: SpaceId): Effect.Effect<Space> =>
  Effect.callback<Space>((resume) => {
    const existing = client.spaces.get(spaceId);
    if (existing) {
      resume(Effect.succeed(existing));
      return;
    }
    const subscription = client.spaces.subscribe(() => {
      const space = client.spaces.get(spaceId);
      if (space) {
        resume(Effect.succeed(space));
      }
    });
    return Effect.sync(() => subscription.unsubscribe());
  });

/** Remove a query param from the current browser URL. */
const removeQueryParam = (key: string) => {
  const current = new URL(window.location.href);
  current.searchParams.delete(key);
  history.replaceState(null, '', current.pathname + current.search + current.hash);
};
