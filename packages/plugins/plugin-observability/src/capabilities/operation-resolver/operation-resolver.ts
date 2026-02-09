//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import * as E from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Observability } from '@dxos/observability';
import { OperationResolver } from '@dxos/operation';

import { type ObservabilitySettingsProps } from '../../components';
import { meta } from '../../meta';
import { ObservabilityCapabilities, ObservabilityOperation } from '../../types';

export default Capability.makeModule(
  E.fnUntraced(function* (props?: { namespace: string }) {
    const { namespace } = props!;
    const capabilities = yield* Capability.Service;

    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // Toggle
      //
      OperationResolver.make({
        operation: ObservabilityOperation.Toggle,
        handler: E.fnUntraced(function* (input) {
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
          observability.events.captureEvent('observability.toggle', {
            enabled: newEnabled,
          });

          if (newEnabled) {
            yield* observability.enable();
          } else {
            yield* observability.disable();
          }
          yield* E.promise(() => Observability.storeObservabilityDisabled(namespace, !newEnabled));
          return newEnabled;
        }),
      }),

      //
      // SendEvent
      //
      OperationResolver.make({
        operation: ObservabilityOperation.SendEvent,
        handler: E.fnUntraced(function* (input) {
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
        handler: E.fnUntraced(function* (input) {
          const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
          observability.feedback.captureUserFeedback({ message: input.message });
        }),
      }),
    ]);
  }),
);
