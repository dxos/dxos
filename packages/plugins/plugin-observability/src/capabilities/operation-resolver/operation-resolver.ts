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
    const capabilities = yield* Capability.Service;

    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // Toggle
      //
      OperationResolver.make({
        operation: ObservabilityOperation.Toggle,
        handler: Effect.fnUntraced(function* (input) {
          const client = yield* Capability.get(ClientCapability);
          const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
          const registry = capabilities.get(Common.Capability.AtomRegistry);
          const allSettings = capabilities.getAll(Common.Capability.Settings);
          const settingsObj = allSettings.find((s: Common.Capability.Settings) => s.prefix === meta.id);
          if (!settingsObj) {
            return false;
          }
          const settings = registry.get(settingsObj.atom) as ObservabilitySettingsProps;
          const newEnabled = input.state ?? !settings.enabled;
          registry.set(settingsObj.atom, { ...settings, enabled: newEnabled });
          observability.track({
            ...getTelemetryIdentity(client),
            action: 'observability.toggle',
            properties: {
              enabled: newEnabled,
            },
          });
          observability.setMode(newEnabled ? 'basic' : 'disabled');
          yield* Effect.promise(() => storeObservabilityDisabled(namespace, !newEnabled));
          return newEnabled;
        }),
      }),

      //
      // SendEvent
      //
      OperationResolver.make({
        operation: ObservabilityOperation.SendEvent,
        handler: Effect.fnUntraced(function* (input) {
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
        handler: Effect.fnUntraced(function* (input) {
          const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
          observability.captureUserFeedback(input.message);
        }),
      }),
    ]);
  }),
);
