//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { getTelemetryIdentifier, storeObservabilityDisabled } from '@dxos/observability';

import { ClientCapability, ObservabilityCapabilities } from './capabilities';
import { type ObservabilitySettingsProps } from '../components';
import { OBSERVABILITY_PLUGIN } from '../meta';
import { ObservabilityAction } from '../types';

export default ({ context, namespace }: { context: PluginsContext; namespace: string }) =>
  contributes(Capabilities.IntentResolver, [
    createResolver(ObservabilityAction.Toggle, async ({ state }) => {
      const client = context.requestCapability(ClientCapability);
      const observability = context.requestCapability(ObservabilityCapabilities.Observability);
      const settings = context
        .requestCapability(Capabilities.SettingsStore)
        .getStore<ObservabilitySettingsProps>(OBSERVABILITY_PLUGIN)!.value;
      settings.enabled = state ?? !settings.enabled;
      observability.event({
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.observability.toggle`,
        properties: {
          enabled: settings.enabled,
        },
      });
      observability.setMode(settings.enabled ? 'basic' : 'disabled');
      await storeObservabilityDisabled(namespace, !settings.enabled);
      return { data: settings.enabled };
    }),
    createResolver(ObservabilityAction.SendEvent, async (data) => {
      const client = context.requestCapability(ClientCapability);
      const observability = context.requestCapability(ObservabilityCapabilities.Observability);
      const event = {
        identityId: getTelemetryIdentifier(client),
        name: `${namespace}.${data.name}`,
        properties: {
          ...data.properties,
        },
      };
      observability.event(event);
    }),
    createResolver(ObservabilityAction.CaptureUserFeedback, async (data) => {
      const observability = context.requestCapability(ObservabilityCapabilities.Observability);
      observability.captureUserFeedback(data.email, data.name, data.message);
    }),
  ]);
