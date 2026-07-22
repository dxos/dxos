//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { ConnectionTestError, Connector, type CredentialForm, type TestConnection } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import { BLUESKY_PROVIDER_ID, BLUESKY_SOURCE } from '../constants';
import { BlueskyOperation } from '../operations';
import { BlueskyApi } from '../services';
import { BlueskyTargetOptions } from '../types';

/**
 * OAuth scopes for Bluesky.
 *
 * `transition:generic` is the legacy coarse scope that maps to the same
 * surface area as an app password: read + write across `app.bsky.*`
 * (timeline, posts, likes, bookmarks, feed generators, preferences).
 * It is the only scope edge currently declares in its atproto
 * `client_metadata` alongside `atproto`.
 *
 * Granular permission-set scopes (`include:app.bsky.authFullApp?aud=…`)
 * are the long-term replacement, but bsky.social's auth server validates
 * requested scopes against `client_metadata.scope` with literal string
 * equality (no wildcard subsumption, no permission-set expansion). To
 * move off transition scopes, edge needs to be able to advertise
 * arbitrary plugin-contributed scopes in its `client_metadata` — either
 * by aggregating scopes from registered providers into a single
 * `client_metadata.json`, or by serving a per-provider `client_metadata`
 * URL so each plugin gets its own OAuth client identity. Until that
 * lands, plugins can only request scopes already enumerated in edge's
 * static metadata, which today is just the transition scopes.
 *
 * Refs:
 * - https://atproto.com/specs/oauth
 * - https://github.com/bluesky-social/atproto/discussions/4437
 */
const BSKY_OAUTH_SCOPES = ['transition:generic'] as const;

/** Schema for the atproto pre-flight form (handle / DID). */
const AtprotoPreflightForm = Schema.Struct({
  handle: Schema.String.annotations({
    title: 'Handle',
    description: 'Your atproto handle or DID (e.g. user.bsky.social).',
    examples: ['user.bsky.social'],
  }),
});

const credentialForm: CredentialForm<Schema.Schema.Type<typeof AtprotoPreflightForm>> = {
  schema: AtprotoPreflightForm,
  defaultValues: { handle: '' },
  // atproto pre-flight: capture the handle as a `loginHint` and let the
  // coordinator re-enter the OAuth flow with it. The redirect flow mints the
  // AccessToken + Connection; this form never builds them directly.
  onSubmit: ({ values }) => Effect.succeed({ kind: 'oauth', loginHint: values.handle.trim() }),
};

/**
 * Bluesky `testConnection`: fetch the actor's preferences through Edge's
 * atproto proxy with the stored session. A rejected/expired session or
 * transport failure surfaces as a user-facing error so the connection UI can
 * offer to reauthenticate. Credentials resolve through the client (handle → PDS
 * → proxy), so `client` is required here where HTTP-only connectors ignore it.
 */
const testConnection: TestConnection = ({ connection, client }) =>
  BlueskyApi.getSavedFeeds().pipe(
    Effect.provide(BlueskyApi.Credentials.fromConnection(Ref.make(connection), client)),
    Effect.asVoid,
    Effect.mapError(
      () =>
        new ConnectionTestError({ message: 'Bluesky rejected the credential. Reauthenticate to continue syncing.' }),
    ),
  );

/**
 * Contributes the Bluesky connector entry. plugin-connector looks up by
 * `id`; sync runs through `BlueskyOperation.SyncBlueskyTargets` (one binding
 * per call), target discovery runs through `BlueskyOperation.GetBlueskyTargets`,
 * and `materializeTarget` creates the empty local Subscription.Feed bound to
 * each selected target.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(Connector, [
      {
        id: BLUESKY_PROVIDER_ID,
        source: BLUESKY_SOURCE,
        label: 'Bluesky',
        oauth: {
          provider: OAuthProvider.ATPROTO,
          scopes: [...BSKY_OAUTH_SCOPES],
          // bsky.social nullifies window.opener, so popup + postMessage
          // can't be used; rely on Edge redirecting to `/redirect/oauth`.
          useRedirectFlow: true,
        },
        credentialForm,
        optionsSchema: BlueskyTargetOptions,
        materializeTarget: BlueskyOperation.MaterializeBlueskyTarget,
        getSyncTargets: BlueskyOperation.GetBlueskyTargets,
        sync: BlueskyOperation.SyncBlueskyTargets,
        testConnection,
      },
    ]);
  }),
);
