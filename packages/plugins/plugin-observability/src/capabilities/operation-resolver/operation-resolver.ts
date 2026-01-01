//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { getTelemetryIdentity, storeObservabilityDisabled } from '@dxos/observability';

import { type ObservabilitySettingsProps } from '../../components';
import { meta } from '../../meta';
import { ClientCapability, ObservabilityCapabilities, ObservabilityOperation } from '../../types';

export default Capability.makeModule(
  ({ context, namespace }: { context: Capability.PluginContext; namespace: string }) =>
    Effect.succeed(
      Capability.contributes(Common.Capability.OperationResolver, [
        //
        // Toggle
        //
        OperationResolver.make({
          operation: ObservabilityOperation.Toggle,
          handler: (input) =>
            Effect.promise(async () => {
              const client = context.getCapability(ClientCapability);
              const observability = context.getCapability(ObservabilityCapabilities.Observability);
              const settings = context
                .getCapability(Common.Capability.SettingsStore)
                .getStore<ObservabilitySettingsProps>(meta.id)!.value;
              settings.enabled = input.state ?? !settings.enabled;
              observability.track({
                ...getTelemetryIdentity(client),
                action: 'observability.toggle',
                properties: {
                  enabled: settings.enabled,
                },
              });
              observability.setMode(settings.enabled ? 'basic' : 'disabled');
              await storeObservabilityDisabled(namespace, !settings.enabled);
              return settings.enabled;
            }),
        }),

        //
        // SendEvent
        //
        OperationResolver.make({
          operation: ObservabilityOperation.SendEvent,
          handler: (input) =>
            Effect.gen(function* () {
              const client = context.getCapability(ClientCapability);
              const properties = input.properties ?? {};

              // NOTE: This is to ensure that events fired before observability is ready are still sent.
              void Effect.gen(function* () {
                const observability = yield* context.waitForCapability(ObservabilityCapabilities.Observability);
                observability.track({
                  ...getTelemetryIdentity(client),
                  action: input.name,
                  properties,
                });
              }).pipe(runAndForwardErrors);
            }),
        }),

        //
        // CaptureUserFeedback
        //
        OperationResolver.make({
          operation: ObservabilityOperation.CaptureUserFeedback,
          handler: (input) =>
            Effect.sync(() => {
              const observability = context.getCapability(ObservabilityCapabilities.Observability);
              observability.captureUserFeedback(input.message);
            }),
        }),
      ]),
    ),
);
