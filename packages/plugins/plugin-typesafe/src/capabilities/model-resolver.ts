//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as AiError from 'effect/unstable/ai/AiError';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';

import { TypeSafeResolver } from '@dxos/ai/resolvers';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createEdgeIdentity } from '@dxos/client/edge';
import * as Credential from '@dxos/compute/Credential';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { TypeSafeCapabilities } from '#types';

import { TYPESAFE_SOURCE } from '../constants.ts';
import { EDGE_ENDPOINT, isEdgeRequest, makeEdgeHttpClient } from './edge-http-client.ts';

/** The space's connected key, if any. Absence is an ordinary state, so lookup failures read as none. */
const connectedApiKey = Effect.gen(function* () {
  const credentials = yield* Credential.CredentialsService;
  const matches = yield* Effect.tryPromise(() => credentials.queryCredentials({ service: TYPESAFE_SOURCE })).pipe(
    Effect.orElseSucceed((): Credential.ServiceCredential[] => []),
  );
  const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
  return apiKey ? Redacted.make(apiKey) : undefined;
});

/** A direct endpoint has no platform key behind it, so a space with nothing connected cannot call it. */
const requiredApiKey = connectedApiKey.pipe(
  Effect.flatMap((apiKey) =>
    apiKey
      ? Effect.succeed(apiKey)
      : Effect.fail(
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

/**
 * Where a call goes. Unset routes through EDGE; so does the vendor URL, the previous default and still
 * in persisted settings, since a browser can never call it (no CORS).
 */
const resolveEndpoint = (configured: string | undefined): string => {
  const endpoint = configured?.trim();
  return endpoint && endpoint !== TypeSafeResolver.DEFAULT_ENDPOINT ? endpoint : EDGE_ENDPOINT;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    const registry = yield* Capabilities.AtomRegistry;

    // Settings are read per call rather than required: this module activates at Startup, before
    // settings modules are guaranteed to have been contributed.
    const endpoint = () => {
      const [settingsAtom] = manager.getAll(TypeSafeCapabilities.Settings);
      return resolveEndpoint(settingsAtom && registry.get(settingsAtom).endpoint);
    };

    // Resolved on the first EDGE call rather than here, since the Client capability does not exist
    // yet at Startup.
    let edgeClient: EdgeHttpClient | undefined;
    const getEdgeClient = (): EdgeHttpClient => {
      const [client] = manager.getAll(ClientCapabilities.Client);
      invariant(client, 'Client capability is required for TypeSafe requests.');
      const edgeUrl = client.config.values.runtime?.services?.edge?.url;
      invariant(edgeUrl, 'EDGE services are not configured.');
      edgeClient ??= new EdgeHttpClient(edgeUrl);
      // A no-op unless the identity changed, so the cached EDGE credential survives between calls.
      edgeClient.setIdentity(createEdgeIdentity(client));
      return edgeClient;
    };

    // Through EDGE a connected key is optional (EDGE falls back to the platform key); direct, it is not.
    const apiKey = Effect.suspend(() => (isEdgeRequest(endpoint()) ? connectedApiKey : requiredApiKey));

    const httpClient = Layer.effect(
      HttpClient.HttpClient,
      Effect.map(HttpClient.HttpClient, (direct) => {
        const edge = makeEdgeHttpClient(getEdgeClient);
        return HttpClient.make((request) => (isEdgeRequest(request.url) ? edge : direct).execute(request));
      }),
    ).pipe(Layer.provide(FetchHttpClient.layer));

    return Capability.contribute(
      AppCapabilities.AiModelResolver,
      TypeSafeResolver.make({ apiKey, endpoint }).pipe(Layer.provide(httpClient)),
    );
  }),
);
