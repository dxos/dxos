//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { getTelemetryIdentity, storeObservabilityDisabled } from '@dxos/observability';
import { OperationResolver } from '@dxos/operation';

import { type ObservabilitySettingsProps } from '../../components';
import { meta } from '../../meta';
import { ClientCapability, ObservabilityCapabilities, ObservabilityOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: { namespace: string }) {
    const { namespace } = props!;

    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // Toggle
      //
      OperationResolver.make({
        operation: ObservabilityOperation.Toggle,
        handler: (input) =>
          Effect.gen(function* () {
            const client = yield* Capability.get(ClientCapability);
            const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
            const settingsStore = yield* Capability.get(Common.Capability.SettingsStore);
            const settings = settingsStore.getStore<ObservabilitySettingsProps>(meta.id)!.value;
            settings.enabled = input.state ?? !settings.enabled;
            observability.track({
              ...getTelemetryIdentity(client),
              action: 'observability.toggle',
              properties: {
                enabled: settings.enabled,
              },
            });
            observability.setMode(settings.enabled ? 'basic' : 'disabled');
            yield* Effect.promise(() => storeObservabilityDisabled(namespace, !settings.enabled));
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
            // NOTE: This is to ensure that events fired before observability is ready are still sent.
            const observability = yield* Capability.waitFor(ObservabilityCapabilities.Observability);
            const client = yield* Capability.get(ClientCapability);
            const properties = input.properties ?? {};

            observability.track({
              ...getTelemetryIdentity(client),
              action: input.name,
              properties,
            });
          }),
      }),

      //
      // CaptureUserFeedback
      //
      OperationResolver.make({
        operation: ObservabilityOperation.CaptureUserFeedback,
        handler: (input) =>
          Effect.gen(function* () {
            const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
            observability.captureUserFeedback(input.message);
          }),
      }),
    ]);
  }),
);
