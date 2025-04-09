//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, IntentAction, type PluginsContext } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { getTelemetryIdentity, storeObservabilityDisabled } from '@dxos/observability';

import { ClientCapability, ObservabilityCapabilities } from './capabilities';
import { type ObservabilitySettingsProps } from '../components';
import { OBSERVABILITY_PLUGIN } from '../meta';
import { ObservabilityAction } from '../types';

export default ({ context, namespace }: { context: PluginsContext; namespace: string }) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: IntentAction.Track,
      resolve: (intent) => {
        log.info('intent', { intent });
      },
    }),
    createResolver({
      intent: ObservabilityAction.Toggle,
      resolve: async ({ state }) => {
        const client = context.requestCapability(ClientCapability);
        const observability = context.requestCapability(ObservabilityCapabilities.Observability);
        const settings = context
          .requestCapability(Capabilities.SettingsStore)
          .getStore<ObservabilitySettingsProps>(OBSERVABILITY_PLUGIN)!.value;
        settings.enabled = state ?? !settings.enabled;
        observability.track({
          ...getTelemetryIdentity(client),
          action: 'observability.toggle',
          properties: {
            enabled: settings.enabled,
          },
        });
        observability.setMode(settings.enabled ? 'basic' : 'disabled');
        await storeObservabilityDisabled(namespace, !settings.enabled);
        return { data: settings.enabled };
      },
    }),
    createResolver({
      intent: ObservabilityAction.SendEvent,
      resolve: (data) => {
        const client = context.requestCapability(ClientCapability);
        // NOTE: This is to ensure that events fired before observability is ready are still sent.
        // TODO(wittjosiah): If the intent dispatcher supports concurrent actions in the future,
        //   then this could be awaited still rather than voiding.
        void context.waitForCapability(ObservabilityCapabilities.Observability).then((observability) => {
          observability.track({
            ...getTelemetryIdentity(client),
            action: data.name,
            properties: {
              ...data.properties,
            },
          });
        });
      },
    }),
    createResolver({
      intent: ObservabilityAction.CaptureUserFeedback,
      resolve: async (data) => {
        const observability = context.requestCapability(ObservabilityCapabilities.Observability);
        observability.captureUserFeedback(data.email, data.name, data.message);
      },
    }),
  ]);
