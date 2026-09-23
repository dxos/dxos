//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Redacted from 'effect/Redacted';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { DecisionError, DecisionModel, TypeSafeClient } from '@dxos/ai-typesafe';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { createEdgeIdentity } from '@dxos/client/edge';
import * as Credential from '@dxos/compute/Credential';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { TypeSafeCapabilities } from '#types';

import { TYPESAFE_SOURCE } from '../constants.ts';
import { MissingCredentialError } from '../errors.ts';
import { EDGE_SENTINEL_ENDPOINT, makeEdgeFetch } from './edge-fetch.ts';

/**
 * The API key the connector stored. `getApiKeyValue` resolves a server-custodied token too, and
 * signals absence as a defect; a space with nothing connected is an ordinary state, so it becomes a
 * typed failure the caller can act on.
 */
const apiKey = Credential.getApiKeyValue({ service: TYPESAFE_SOURCE }).pipe(
  Effect.catchCause((cause) => Effect.fail(new MissingCredentialError({ cause }))),
);

/**
 * The endpoint to call directly, if any. The vendor URL was the previous default and is still in
 * persisted settings, but a browser cannot call it (no CORS), so it routes through EDGE like unset.
 */
const directEndpoint = (endpoint: string | undefined): string | undefined =>
  endpoint && endpoint.trim().length > 0 && endpoint !== TypeSafeClient.DEFAULT_ENDPOINT ? endpoint : undefined;

/**
 * Builds the client for one call. With no endpoint override the call goes through EDGE, where a
 * connected key is optional; an override is called directly, so it needs the key.
 */
const makeClient = (
  endpoint: string | undefined,
  getEdgeClient: () => EdgeHttpClient,
): Effect.Effect<DecisionModel.Service, MissingCredentialError, Credential.CredentialsService> =>
  endpoint
    ? apiKey.pipe(Effect.map((key) => TypeSafeClient.make({ apiKey: Redacted.make(key), endpoint })))
    : Effect.option(apiKey).pipe(
        Effect.map((key) =>
          TypeSafeClient.make({
            endpoint: EDGE_SENTINEL_ENDPOINT,
            fetch: makeEdgeFetch(getEdgeClient, Option.getOrUndefined(key)),
          }),
        ),
      );

/**
 * The decision model.
 *
 * The key is resolved per call rather than captured when the slice materialises, so connecting
 * TypeSafe takes effect on the next question instead of after a restart — and disconnecting it
 * falls back to the platform key rather than a client that still authenticates as the user.
 */
const decisionModelLayer = (
  endpoint: () => string | undefined,
  getEdgeClient: () => EdgeHttpClient,
): Layer.Layer<DecisionModel.DecisionModel, never, Credential.CredentialsService> =>
  Layer.effect(
    DecisionModel.DecisionModel,
    Effect.gen(function* () {
      // Captured so `evaluate` can resolve the credential without the caller providing the service.
      const context = yield* Effect.context<Credential.CredentialsService>();
      return DecisionModel.make({
        evaluate: (request) =>
          makeClient(endpoint(), getEdgeClient).pipe(
            Effect.mapError((error) => new DecisionError({ source: TYPESAFE_SOURCE }, { cause: error })),
            Effect.flatMap((client) => client.evaluate(request)),
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
      // Read at call time, so changing the endpoint in settings does not need a restart.
      () => decisionModelLayer(() => directEndpoint(registry.get(settingsAtom).endpoint), getEdgeClient),
    );

    return Capability.contribute(Capabilities.LayerSpec, DecisionModelSpec);
  }),
);
