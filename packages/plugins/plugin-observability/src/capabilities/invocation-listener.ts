//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ObservabilityMapping from '@dxos/app-toolkit/ObservabilityMapping';
import { log } from '@dxos/log';

import { ObservabilityOperation } from '#types';

/** The event an invocation was mapped to. */
export type MappedEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

/**
 * Consumes the invoker's stream of successful invocations, sending the event each one was mapped to.
 * Never fails: telemetry must not fail the action it observes, which has already succeeded.
 *
 * `getMappings` is read per event rather than captured, so an operation registered by a plugin that
 * enables later is picked up without restarting the listener.
 */
export const listen = (
  invoker: Capabilities.OperationInvoker,
  getMappings: () => readonly ObservabilityMapping.ObservabilityMapping[],
  send: (event: MappedEvent) => Effect.Effect<void, unknown>,
): Effect.Effect<void> =>
  Stream.fromPubSub(invoker.invocations).pipe(
    Stream.runForEach((event) =>
      Effect.gen(function* () {
        const mapping = ObservabilityMapping.find(getMappings(), event.operation);
        if (!mapping) {
          return;
        }

        const properties = mapping.properties?.(event.input, event.output);
        // A mapping declines an individual invocation by deriving no properties.
        if (mapping.properties && !properties) {
          return;
        }

        yield* send({ name: mapping.event, properties }).pipe(
          Effect.catch((error) => Effect.sync(() => log.catch(error))),
        );
      }),
    ),
  );

/**
 * Sends the observability event a successful invocation stands for, for operations that registered
 * one via {@link AppCapabilities.ObservabilityMapping}.
 *
 * The listener owns telemetry so a portable verb (`space.addObject`, run equally on a headless
 * host) need not bind itself to this plugin's `SendEvent`.
 */
export const InvocationListener = Capability.makeModule(
  'InvocationListener',
  {
    requires: [Capabilities.OperationInvoker, AppCapabilities.ObservabilityMapping],
    provides: [],
    // Idle rather than Startup: contributed mappings are read live, so the listener only has to be
    // running before the first user action, not before the plugins that register events.
    activatesOn: ActivationEvents.Idle,
  },
  Effect.fnUntraced(function* () {
    const invoker = yield* Capabilities.OperationInvoker;
    const mappings = yield* AppCapabilities.ObservabilityMapping;

    yield* Effect.forkScoped(
      listen(
        invoker,
        () => mappings.get().flat(),
        (event) => invoker.invoke(ObservabilityOperation.SendEvent, event),
      ),
    );

    return [];
  }),
);
