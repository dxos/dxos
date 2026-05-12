//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type CredentialForm, IntegrationProvider as IntegrationProviderCapability } from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';

import { BLUESKY_PROVIDER_ID, BLUESKY_SOURCE } from '../constants';
import { BlueskyOperation } from '../operations';
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
  onSubmit: ({ values }) => Effect.succeed({ kind: 'oauth', loginHint: values.handle.trim() }),
};

/**
 * Contributes the Bluesky integration-provider entry. plugin-integration
 * looks up by `id`; sync runs through `BlueskyOperation.SyncBlueskyTargets`
 * and target discovery runs through `BlueskyOperation.GetBlueskyTargets`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
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
        getSyncTargets: BlueskyOperation.GetBlueskyTargets,
        sync: BlueskyOperation.SyncBlueskyTargets,
      },
    ]);
  }),
);
