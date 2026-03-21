//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Observability } from '@dxos/observability';
import { Operation } from '@dxos/operation';

import { type ObservabilitySettingsProps } from '../containers';
import { meta } from '../meta';
import { ObservabilityCapabilities } from '../types';

import { Toggle } from './definitions';

const handler: Operation.WithHandler<typeof Toggle> = Toggle.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const namespace = yield* Capability.get(ObservabilityCapabilities.Namespace);
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const capabilities = yield* Capability.Service;
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
  ),
);

export default handler;
