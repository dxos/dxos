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

import { TypeSafeCapabilities, TypeSafeSettings } from '#types';

import { TYPESAFE_SOURCE } from '../constants.ts';
import {
  EDGE_ENDPOINT,
  WORKERS_AI_ENDPOINT,
  isEdgeRequest,
  isWorkersAiRequest,
  makeEdgeHttpClient,
} from './edge-http-client.ts';

const aiError = (reason: AiError.AiErrorReason): AiError.AiError =>
  AiError.make({ module: 'TypeSafe', method: 'decide', reason });

/**
 * The space's connected key, if any. A failed lookup fails the decision rather than reading as "no
 * key": through EDGE that would silently bill the platform key for a space that brought its own.
 */
export const connectedApiKey = Effect.gen(function* () {
  const credentials = yield* Credential.CredentialsService;
  const matches = yield* Effect.tryPromise(() => credentials.queryCredentials({ service: TYPESAFE_SOURCE })).pipe(
    Effect.mapError(() =>
      aiError(new AiError.UnknownError({ description: `Failed to look up the ${TYPESAFE_SOURCE} credential` })),
    ),
  );
  const apiKey = matches.find((credential) => credential.apiKey)?.apiKey;
  return apiKey ? Redacted.make(apiKey) : undefined;
});

/**
 * A direct endpoint has no platform key behind it, so a space with nothing connected cannot call it.
 * The key goes out as a bearer token, so an endpoint that would send it in cleartext is refused
 * before the key is read.
 */
export const requiredApiKey = (endpoint: string) =>
  TypeSafeSettings.isAllowedEndpoint(endpoint)
    ? connectedApiKey.pipe(
        Effect.flatMap((apiKey) =>
          apiKey
            ? Effect.succeed(apiKey)
            : Effect.fail(
                aiError(
                  new AiError.AuthenticationError({
                    kind: 'MissingKey',
                    description: `TypeSafe is not connected in this space (no ${TYPESAFE_SOURCE} credential)`,
                  }),
                ),
              ),
        ),
      )
    : Effect.fail(
        aiError(
          new AiError.InvalidRequestError({
            description: 'The TypeSafe endpoint override must be an https URL (http only for localhost).',
          }),
        ),
      );

/**
 * Where a call goes. Workers AI always goes through EDGE. Otherwise an unset endpoint routes through
 * EDGE; so does the vendor URL, the previous default and still in persisted settings, since a browser
 * can never call it (no CORS).
 */
export const resolveEndpoint = (settings: TypeSafeSettings.Settings | undefined): string => {
  if (settings?.backend === 'workers-ai') {
    return WORKERS_AI_ENDPOINT;
  }
  const endpoint = settings?.endpoint?.trim();
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
      return resolveEndpoint(settingsAtom && registry.get(settingsAtom));
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

    // Workers AI takes no vendor key; through EDGE to TypeSafe a connected key is optional (EDGE falls
    // back to the platform key); direct, it is not.
    const apiKey = Effect.suspend(() => {
      const url = endpoint();
      return isWorkersAiRequest(url)
        ? Effect.succeed(undefined)
        : isEdgeRequest(url)
          ? connectedApiKey
          : requiredApiKey(url);
    });

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
