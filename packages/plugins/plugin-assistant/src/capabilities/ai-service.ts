//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiModelResolver, AiService } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Credential, LayerSpec } from '@dxos/compute';
import { configuredCredentialsLayer } from '@dxos/functions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const resolvers = yield* Capability.getAll(AppCapabilities.AiModelResolver);

    // TODO(dmaretskyi): Extract function to reduce them.
    const combinedLayer = resolvers.reduce(
      (acc, resolver) => resolver.pipe(Layer.provide(acc)),
      AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Effect.succeed({})), // Empty resolver as fallback.
    );

    // The combined resolver layer inherits `Credential.CredentialsService` from any BYOK-enabled
    // resolver (e.g. the edge Anthropic resolver wraps its HTTP client with `byokHeaderLayer`). The
    // requirement is satisfied by the space-affinity `CredentialsLayerSpec` in `plugin-client`.
    const aiServiceLayer = AiModelResolver.AiModelResolver.buildAiService.pipe(Layer.provide(combinedLayer));

    const aiServiceSpec = LayerSpec.make(
      {
        affinity: 'space',
        requires: [Credential.CredentialsService],
        provides: [AiService.AiService],
      },
      () => aiServiceLayer,
    );

    return [
      // Deprecated: `AppCapabilities.AiServiceLayer` is retained for non-process-manager
      // call sites (e.g. legacy CLI paths and the comment-thread agent runner). It cannot carry
      // BYOK because there is no space context at the capability-aggregation point — fall back to an
      // empty credential store, mirroring the worker path in `functions/src/protocol/protocol.ts`.
      // New consumers should resolve `AiService.AiService` through the process manager runtime via
      // the `LayerSpec` contribution below.
      Capability.contributes(
        AppCapabilities.AiServiceLayer,
        aiServiceLayer.pipe(Layer.provide(configuredCredentialsLayer([]))),
      ),
      Capability.contributes(Capabilities.LayerSpec, aiServiceSpec),
    ];
  }),
);
