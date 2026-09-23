//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as AiError from 'effect/unstable/ai/AiError';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { TypeSafeResolver } from '@dxos/ai/resolvers';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Credential from '@dxos/compute/Credential';

import { TypeSafeCapabilities } from '#types';

import { TYPESAFE_SOURCE } from '../constants.ts';

/**
 * The API key the connector stored. `getApiKeyValue` signals absence as a defect; a space with
 * nothing connected is an ordinary state, so it becomes a typed failure the caller can act on.
 */
const apiKey = Credential.getApiKeyValue({ service: TYPESAFE_SOURCE }).pipe(
  Effect.map(Redacted.make),
  Effect.catchCause(() =>
    Effect.fail(
      AiError.make({
        module: 'TypeSafe',
        method: 'decide',
        reason: new AiError.AuthenticationError({
          kind: 'MissingKey',
          description: `TypeSafe is not connected in this space (no ${TYPESAFE_SOURCE} credential)`,
        }),
      }),
    ),
  ),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    const registry = yield* Capabilities.AtomRegistry;

    // Settings are read per call rather than required: this module activates at Startup, before
    // settings modules are guaranteed to have been contributed.
    const endpoint = () => {
      const [settingsAtom] = manager.getAll(TypeSafeCapabilities.Settings);
      return (settingsAtom && registry.get(settingsAtom).endpoint) || TypeSafeResolver.DEFAULT_ENDPOINT;
    };

    return Capability.contribute(
      AppCapabilities.AiModelResolver,
      TypeSafeResolver.make({ apiKey, endpoint }).pipe(Layer.provide(FetchHttpClient.layer)),
    );
  }),
);
