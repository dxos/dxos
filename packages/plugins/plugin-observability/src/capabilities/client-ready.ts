//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  SettingsAction,
  contributes,
  createIntent,
} from '@dxos/app-framework';
import { ObservabilityProvider } from '@dxos/observability/next';

import { meta } from '../meta';

import { ClientCapability, ObservabilityCapabilities } from './capabilities';

export default async (context: PluginContext) => {
  const observability = context.getCapability(ObservabilityCapabilities.Observability);
  const manager = context.getCapability(Capabilities.PluginManager);
  const state = context.getCapability(ObservabilityCapabilities.State);
  const client = context.getCapability(ClientCapability);
  const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);

  // Ensure errors are tagged with enabled plugins to help with reproductions.
  const pluginTags = Object.fromEntries(manager.enabled.map((plugin) => [`pluginEnabled-${plugin}`, 'true']));
  observability.setTags(pluginTags, 'errors');

  await Effect.gen(function* () {
    yield* observability.addDataProvider(ObservabilityProvider.Client.identityProvider(client.services.services));
    yield* observability.addDataProvider(ObservabilityProvider.Client.networkMetricsProvider(client.services.services));
    yield* observability.addDataProvider(ObservabilityProvider.Client.runtimeMetricsProvider(client.services.services));
    yield* observability.addDataProvider(ObservabilityProvider.Client.spacesMetricsProvider(client));

    const environment = client?.config?.values.runtime?.app?.env?.DX_ENVIRONMENT;
    const notify =
      environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');
    if (client.halo.identity.get() && notify && !state.notified) {
      yield* dispatch(
        createIntent(LayoutAction.AddToast, {
          part: 'toast',
          subject: {
            id: `${meta.id}/notice`,
            title: ['observability toast label', { ns: meta.id }],
            description: ['observability toast description', { ns: meta.id }],
            duration: Infinity,
            icon: 'ph--info--regular',
            actionLabel: ['observability toast action label', { ns: meta.id }],
            actionAlt: ['observability toast action alt', { ns: meta.id }],
            closeLabel: ['observability toast close label', { ns: meta.id }],
            onAction: () => dispatch(createIntent(SettingsAction.Open, { plugin: meta.id })),
          },
        }),
      );

      state.notified = true;
    }
  }).pipe(Effect.runPromise);

  return contributes(Capabilities.Null, null);
};
