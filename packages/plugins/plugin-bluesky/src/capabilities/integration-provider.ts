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
          scopes: ['transition:email', 'transition:generic'],
          // bsky.social nullifies window.opener, so popup + postMessage
          // can't be used; rely on Edge redirecting to `/redirect/oauth`.
          useRedirectFlow: true,
        },
        credentialForm,
        getSyncTargets: BlueskyOperation.GetBlueskyTargets,
        sync: BlueskyOperation.SyncBlueskyTargets,
      },
    ]);
  }),
);
