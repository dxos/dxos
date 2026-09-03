//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { ObservabilityCapabilities, ObservabilityOperation } from '#types';

import { applyTelemetrySettings, readySettingsSpace, writeTelemetrySettings } from '../util';

const handler: Operation.WithHandler<typeof ObservabilityOperation.SetAiContentCapture> =
  ObservabilityOperation.SetAiContentCapture.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const observability = yield* Capability.get(ObservabilityCapabilities.Observability);
        const namespace = yield* Capability.get(ObservabilityCapabilities.Namespace);
        const capabilities = yield* Capability.Service;
        const enabled = input.state;

        observability.events.captureEvent('observability.aiContentCapture', { enabled });
        yield* applyTelemetrySettings(
          {
            observability,
            namespace,
            registry: capabilities.get(Capabilities.AtomRegistry),
            settingsAtom: capabilities.getAll(ObservabilityCapabilities.Settings)[0],
          },
          { aiContentCapture: enabled },
        );

        const [client] = capabilities.getAll(ObservabilityCapabilities.ClientCapability);
        const settingsSpace = client && readySettingsSpace(client);
        if (settingsSpace) {
          writeTelemetrySettings(settingsSpace, { aiContentCapture: enabled });
        }

        return enabled;
      }),
    ),
  );

export default handler;
