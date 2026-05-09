//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import {
  type CredentialForm,
  IntegrationProvider as IntegrationProviderCapability,
} from '@dxos/plugin-integration/types';
import { OAuthProvider } from '@dxos/protocols';

import { BLUESKY_PROVIDER_ID, BLUESKY_SOURCE } from '../constants';
import { BlueskyOperation } from '../operations';
import { BlueskyTargetOptions } from '../types';

/**
 * Bluesky-published permission set covering full read + write access to
 * `app.bsky.*` (timeline, posts, likes, bookmarks, feed generators,
 * preferences, and creating/deleting posts/likes/reposts/bookmarks).
 *
 * Replaces the legacy `transition:generic` / `transition:email` coarse
 * scopes. We request the full-app set rather than `authViewAll` so the
 * user only authorizes once and we can add post-creation flows later
 * without forcing a re-OAuth.
 *
 * `?aud=` pins the AppView the auth context targets — `bsky_appview` is
 * Bluesky's official one. The `#` is part of the audience DID-URL
 * fragment and is sent through Edge's PAR body verbatim.
 *
 * Refs:
 * - https://atproto.com/specs/permission
 * - https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/authFullApp.json
 */
const BSKY_FULL_APP_SCOPE = 'include:app.bsky.authFullApp?aud=did:web:api.bsky.app#bsky_appview';

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
          scopes: [BSKY_FULL_APP_SCOPE],
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
