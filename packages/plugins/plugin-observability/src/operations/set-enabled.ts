//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { ObservabilityCapabilities, ObservabilityOperation } from '#types';

import { applyTelemetryEnabled, readySettingsSpace, writeTelemetryEnabled } from '../util';

const handler: Operation.WithHandler<typeof ObservabilityOperation.SetEnabled> = ObservabilityOperation.SetEnabled.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
      const namespace = yield* Capability.get(ObservabilityCapabilities.Namespace);
      const capabilities = yield* Capability.Service;
      const enabled = input.state;

      observability.events.captureEvent('observability.toggle', { enabled });
      yield* applyTelemetryEnabled(
        {
          observability,
          namespace,
          registry: capabilities.get(Capabilities.AtomRegistry),
          settingsAtom: capabilities.getAll(ObservabilityCapabilities.Settings)[0],
        },
        enabled,
      );

      // The choice replicates to the user's other devices; a host without the space keeps it local.
      const [client] = capabilities.getAll(ObservabilityCapabilities.ClientCapability);
      const settingsSpace = client && readySettingsSpace(client);
      if (settingsSpace) {
        writeTelemetryEnabled(settingsSpace, enabled);
      }

      return enabled;
    }),
  ),
);

export default handler;
