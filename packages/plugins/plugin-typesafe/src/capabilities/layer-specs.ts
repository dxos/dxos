//
// Copyright 2026 DXOS.org
//

import * as TypeSafeClient from '@effect/ai-typesafe/TypeSafeClient';
import * as TypeSafeDecisionModel from '@effect/ai-typesafe/TypeSafeDecisionModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { createEdgeIdentity } from '@dxos/client/edge';
import * as Credential from '@dxos/compute/Credential';
import * as Header from '@dxos/compute/Header';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { EdgeAiHttpClient, EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { TypeSafeCapabilities } from '#types';

import { TYPESAFE_MODEL, TYPESAFE_SOURCE } from '../constants.ts';

/** Host stripped by {@link EdgeAiHttpClient}; only the `/v1/...` path reaches EDGE. */
const EDGE_SENTINEL_API_URL = 'http://edge.internal/v1';

/** The space's connected key, if any. Absence is an ordinary state, so lookup failures read as none. */
const connectedApiKey = Effect.gen(function* () {
  const credentials = yield* Credential.CredentialsService;
  const matches = yield* Effect.tryPromise(() => credentials.queryCredentials({ service: TYPESAFE_SOURCE })).pipe(
    Effect.orElseSucceed((): Credential.ServiceCredential[] => []),
  );
  return matches.find((credential) => credential.apiKey)?.apiKey;
});

/**
 * Calls System One directly with the connected key as a bearer token. Without one the vendor
 * answers 401, which surfaces as an `AiError` the caller can report.
 */
const directHttpClient: Layer.Layer<HttpClient.HttpClient, never, Credential.CredentialsService> = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const context = yield* Effect.context<Credential.CredentialsService>();
    return HttpClient.mapRequestEffect(client, (request) =>
      connectedApiKey.pipe(
        Effect.map((apiKey) => (apiKey ? HttpClientRequest.bearerToken(request, apiKey) : request)),
        Effect.provide(context),
      ),
    );
  }),
).pipe(Layer.provide(FetchHttpClient.layer));

/**
 * The provider stack for one call. Through EDGE (no `apiUrl`) a connected key rides as `X-BYOK` and
 * EDGE otherwise uses its platform key; an `apiUrl` bypasses EDGE and needs the key.
 */
export const providerLayer = (
  apiUrl: string | undefined,
  getEdgeClient: () => EdgeHttpClient,
): Layer.Layer<DecisionModel.DecisionModel, never, Credential.CredentialsService> =>
  TypeSafeDecisionModel.layer({ model: TYPESAFE_MODEL }).pipe(
    Layer.provide(TypeSafeClient.layer({ apiUrl: apiUrl ?? EDGE_SENTINEL_API_URL })),
    Layer.provide(
      apiUrl
        ? directHttpClient
        : Header.byokLayer(TYPESAFE_SOURCE).pipe(
            Layer.provide(EdgeAiHttpClient.layer(getEdgeClient, { service: 'typesafe' })),
          ),
    ),
  );

/**
 * The decision model. The provider stack is built per call, so a settings change or a key connected
 * mid-session takes effect on the next question without restarting the space slice.
 */
const decisionModelLayer = (
  apiUrl: () => string | undefined,
  getEdgeClient: () => EdgeHttpClient,
): Layer.Layer<DecisionModel.DecisionModel, never, Credential.CredentialsService> =>
  Layer.effect(
    DecisionModel.DecisionModel,
    Effect.gen(function* () {
      // Captured so `decide` can resolve the credential without the caller providing the service.
      const context = yield* Effect.context<Credential.CredentialsService>();
      return DecisionModel.DecisionModel.of({
        [DecisionModel.TypeId]: DecisionModel.TypeId,
        decide: (definition, options) =>
          DecisionModel.decide(definition, options).pipe(
            Effect.provide(providerLayer(apiUrl(), getEdgeClient)),
            Effect.provide(context),
          ),
      });
    }),
  );

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capability.Service;
    const settingsAtom = yield* Capability.get(TypeSafeCapabilities.Settings);
    const registry: AtomRegistry.AtomRegistry = yield* Capabilities.AtomRegistry;

    // Resolved on the first question rather than here: the Client capability may not exist yet
    // when this module activates.
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

    /** Provides the decision model to every operation running in the space. */
    const DecisionModelSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Credential.CredentialsService],
        provides: [DecisionModel.DecisionModel],
      },
      () =>
        decisionModelLayer(() => {
          const apiUrl = registry.get(settingsAtom).apiUrl?.trim();
          return apiUrl && apiUrl.length > 0 ? apiUrl : undefined;
        }, getEdgeClient),
    );

    return Capability.contribute(Capabilities.LayerSpec, DecisionModelSpec);
  }),
);
