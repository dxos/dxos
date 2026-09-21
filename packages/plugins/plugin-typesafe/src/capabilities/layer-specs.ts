//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import type * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { DecisionError, DecisionModel, TypeSafeClient } from '@dxos/ai-typesafe';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as Credential from '@dxos/compute/Credential';
import * as LayerSpec from '@dxos/compute/LayerSpec';

import { TypeSafeCapabilities } from '#types';

import { TYPESAFE_SOURCE } from '../constants.ts';
import { MissingCredentialError } from '../errors.ts';

/**
 * The API key the connector stored. `getApiKeyValue` resolves a server-custodied token too, and
 * signals absence as a defect; a space with nothing connected is an ordinary state, so it becomes a
 * typed failure the caller can act on.
 */
const apiKey = Credential.getApiKeyValue({ service: TYPESAFE_SOURCE }).pipe(
  Effect.catchCause((cause) => Effect.fail(new MissingCredentialError({ cause }))),
);

/**
 * The decision model, backed by that key.
 *
 * The key is resolved per call rather than captured when the slice materialises, so connecting
 * TypeSafe takes effect on the next question instead of after a restart — and disconnecting it
 * surfaces as a failed decision rather than a client that still authenticates.
 */
const decisionModelLayer = (
  endpoint: () => string,
): Layer.Layer<DecisionModel.DecisionModel, never, Credential.CredentialsService> =>
  Layer.effect(
    DecisionModel.DecisionModel,
    Effect.gen(function* () {
      // Captured so `evaluate` can resolve the credential without the caller providing the service.
      const context = yield* Effect.context<Credential.CredentialsService>();
      return DecisionModel.make({
        evaluate: (request) =>
          apiKey.pipe(
            Effect.mapError((error) => new DecisionError({ source: TYPESAFE_SOURCE }, { cause: error })),
            Effect.flatMap((key) =>
              TypeSafeClient.make({ apiKey: Redacted.make(key), endpoint: endpoint() }).evaluate(request),
            ),
            Effect.provide(context),
          ),
      });
    }),
  );

export const LayerSpecs = AppCapability.layerSpec(
  Effect.fnUntraced(function* () {
    const settingsAtom = yield* Capability.get(TypeSafeCapabilities.Settings);
    const registry: AtomRegistry.AtomRegistry = yield* Capabilities.AtomRegistry;

    /** Provides the decision model to every operation running in the space. */
    const DecisionModelSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Credential.CredentialsService],
        provides: [DecisionModel.DecisionModel],
      },
      // Read at call time, so changing the endpoint in settings does not need a restart.
      () => decisionModelLayer(() => registry.get(settingsAtom).endpoint ?? TypeSafeClient.DEFAULT_ENDPOINT),
    );

    return Capability.contribute(Capabilities.LayerSpec, DecisionModelSpec);
  }),
  {
    name: 'DecisionModel',
    requires: [TypeSafeCapabilities.Settings, Capabilities.AtomRegistry],
  },
);
