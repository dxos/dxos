//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ServiceResolver } from '@dxos/compute';
import { AgentService } from '@dxos/functions-runtime';
import { log } from '@dxos/log';

//
// Capability Module
//
// Rehydrates durable agent processes once {@link ActivationEvents.ProcessManagerReady} fires.
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const runtime = yield* Capability.get(Capabilities.ProcessManagerRuntime);

    runtime.runFork(
      Effect.gen(function* () {
        const service = yield* AgentService.AgentService;
        yield* service.hydrate();
      }).pipe(
        Effect.provide(ServiceResolver.provide({}, AgentService.AgentService)),
        Effect.catchAllCause((cause) =>
          Effect.sync(() => log.warn('agent hydrate failed', { cause: Cause.pretty(cause) })),
        ),
      ),
    );

    return Capability.contributes(Capabilities.Null, null);
  }),
);
