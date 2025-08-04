//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  SettingsAction,
  contributes,
  createIntent,
} from '@dxos/app-framework';
import { type Observability, setupTelemetryListeners } from '@dxos/observability';

import { OBSERVABILITY_PLUGIN } from '../meta';
import { ObservabilityAction } from '../types';

import { ClientCapability, ObservabilityCapabilities } from './capabilities';

type ClientReadyOptions = {
  context: PluginContext;
  namespace: string;
  observability: Observability;
};

export default async ({ context, namespace, observability }: ClientReadyOptions) => {
  const manager = context.getCapability(Capabilities.PluginManager);
  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
  const state = context.getCapability(ObservabilityCapabilities.State);
  const client = context.getCapability(ClientCapability);

  const sendPrivacyNotice = async () => {
    const environment = client?.config?.values.runtime?.app?.env?.DX_ENVIRONMENT;
    const notify =
      environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');
    if (!state.notified && notify) {
      await dispatch(
        createIntent(LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${OBSERVABILITY_PLUGIN}/notice`,
            title: ['observability toast label', { ns: OBSERVABILITY_PLUGIN }],
            description: ['observability toast description', { ns: OBSERVABILITY_PLUGIN }],
            duration: Infinity,
            icon: 'ph--info--regular',
            actionLabel: ['observability toast action label', { ns: OBSERVABILITY_PLUGIN }],
            actionAlt: ['observability toast action alt', { ns: OBSERVABILITY_PLUGIN }],
            closeLabel: ['observability toast close label', { ns: OBSERVABILITY_PLUGIN }],
            onAction: () => dispatch(createIntent(SettingsAction.Open, { plugin: OBSERVABILITY_PLUGIN })),
          },
        }),
      );

      state.notified = true;
    }
  };

  // Ensure errors are tagged with enabled plugins to help with reproductions.
  manager.enabled.map((plugin) => observability?.setTag(`pluginEnabled-${plugin}`, 'true', 'errors'));

  await dispatch(
    createIntent(ObservabilityAction.SendEvent, {
      name: 'page.load',
      properties: {
        // TODO(wittjosiah): These apis are deprecated. Is there a better way to find this information?
        loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
      },
    }),
  );

  // Start client observability (i.e. not running as shared worker)
  // TODO(nf): how to prevent multiple instances for single shared worker?
  const cleanup = setupTelemetryListeners(namespace, client, observability);

  await Promise.all([
    observability.setIdentityTags(client.services.services),
    observability.startRuntimeMetrics(client),
    observability.startNetworkMetrics(client.services.services),
    observability.startSpacesMetrics(client, namespace),
  ]);

  if (client.halo.identity.get()) {
    await sendPrivacyNotice();
  } else {
    const subscription = client.halo.identity.subscribe(async (identity) => {
      if (identity && observability) {
        await sendPrivacyNotice();
        await observability.setIdentityTags(client.services.services);
        subscription.unsubscribe();
      }
    });
  }

  return contributes(ObservabilityCapabilities.Observability, observability, async () => {
    cleanup();
    await observability.close();
  });
};
