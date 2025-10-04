//
// Copyright 2025 DXOS.org
//

import { Capabilities, IntentAction, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { log } from '@dxos/log';

import { type ObservabilitySettingsProps } from '../components';
import { meta } from '../meta';
import { ObservabilityAction } from '../types';

import { ObservabilityCapabilities } from './capabilities';

export default (context: PluginContext) =>
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
        const observability = context.getCapability(ObservabilityCapabilities.Observability);
        const settings = context
          .getCapability(Capabilities.SettingsStore)
          .getStore<ObservabilitySettingsProps>(meta.id)!.value;
        settings.enabled = state ?? !settings.enabled;
        observability.events.captureEvent('observability.toggle', {
          enabled: settings.enabled,
        });

        if (settings.enabled) {
          await observability.enable();
        } else {
          await observability.disable();
        }

        return { data: settings.enabled };
      },
    }),
    createResolver({
      intent: ObservabilityAction.SendEvent,
      resolve: (data) => {
        const properties = 'properties' in data ? data.properties : {};

        // NOTE: This is to ensure that events fired before observability is ready are still sent.
        // TODO(wittjosiah): If the intent dispatcher supports concurrent actions in the future,
        //   then this could be awaited still rather than voiding.
        void context.waitForCapability(ObservabilityCapabilities.Observability).then((observability) => {
          observability.events.captureEvent(data.name, properties);
        });
      },
    }),
    createResolver({
      intent: ObservabilityAction.CaptureUserFeedback,
      resolve: async (data) => {
        const observability = context.getCapability(ObservabilityCapabilities.Observability);
        observability.feedback.captureUserFeedback(data);
      },
    }),
  ]);
