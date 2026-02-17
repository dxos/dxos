//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Observability } from '@dxos/observability';
import { OperationResolver } from '@dxos/operation';

import { type ObservabilitySettingsProps } from '../../components';
import { meta } from '../../meta';
import { ObservabilityCapabilities, ObservabilityOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: { namespace: string }) {
    const { namespace } = props!;
    const capabilities = yield* Capability.Service;

    return Capability.contributes(Capabilities.OperationResolver, [
      //
      // Toggle
      //
      OperationResolver.make({
        operation: ObservabilityOperation.Toggle,
        handler: Effect.fnUntraced(function* (input) {
          const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
          const registry = capabilities.get(Capabilities.AtomRegistry);
          const allSettings = capabilities.getAll(AppCapabilities.Settings);
          const settingsObj = allSettings.find((s: AppCapabilities.Settings) => s.prefix === meta.id);
          if (!settingsObj) {
            return false;
          }
          const settings = registry.get(settingsObj.atom) as ObservabilitySettingsProps;
          const newEnabled = input.state ?? !settings.enabled;
          registry.set(settingsObj.atom, { ...settings, enabled: newEnabled });
          observability.events.captureEvent('observability.toggle', {
            enabled: newEnabled,
          });

          if (newEnabled) {
            yield* observability.enable();
          } else {
            yield* observability.disable();
          }
          yield* Effect.promise(() => Observability.storeObservabilityDisabled(namespace, !newEnabled));
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
          const properties = input.properties ?? {};
          observability.events.captureEvent(input.name, properties);
        }),
      }),

      //
      // CaptureUserFeedback
      //
      OperationResolver.make({
        operation: ObservabilityOperation.CaptureUserFeedback,
        handler: Effect.fnUntraced(function* (input) {
          const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
          observability.feedback.captureUserFeedback({ message: input.message });
        }),
      }),
    ]);
  }),
);
