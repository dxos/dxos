//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { type Observability, ObservabilityProvider } from '@dxos/observability';

import { meta } from '../../meta';
import { ClientCapability, ObservabilityCapabilities, ObservabilityOperation } from '../../types';

export type ClientReadyOptions = {
  namespace: string;
  observability: Observability.Observability;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: ClientReadyOptions) {
    const { observability } = props!;
    const manager = yield* Capability.get(Capabilities.PluginManager);
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(ObservabilityCapabilities.State);
    const client = yield* Capability.get(ClientCapability);

    const sendPrivacyNotice = async () => {
      const environment = client?.config?.values.runtime?.app?.env?.DX_ENVIRONMENT;
      const notify =
        environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');
      const state = registry.get(stateAtom);
      if (!state.notified && notify) {
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.id}/notice`,
          title: ['observability toast label', { ns: meta.id }],
          description: ['observability toast description', { ns: meta.id }],
          duration: Infinity,
          icon: 'ph--info--regular',
          actionLabel: ['observability toast action label', { ns: meta.id }],
          actionAlt: ['observability toast action alt', { ns: meta.id }],
          closeLabel: ['observability toast close label', { ns: meta.id }],
          onAction: () => invokePromise(SettingsOperation.Open, { plugin: meta.id }),
        });

        registry.set(stateAtom, { ...registry.get(stateAtom), notified: true });
      }
    };

    // Ensure errors are tagged with enabled plugins to help with reproductions.
    const enabledPlugins = manager.getEnabled();
    for (const plugin of enabledPlugins) {
      observability.setTags({ [`pluginEnabled-${plugin}`]: 'true' }, 'errors');
    }

    yield* Effect.tryPromise(() =>
      invokePromise(ObservabilityOperation.SendEvent, {
        name: 'page.load',
        properties: {
          // TODO(wittjosiah): These apis are deprecated. Is there a better way to find this information?
          loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
        },
      }),
    );

    // Add client data providers.
    yield* observability.addDataProvider(ObservabilityProvider.Client.identityProvider(client.services.services));
    yield* observability.addDataProvider(ObservabilityProvider.Client.networkMetricsProvider(client.services.services));
    yield* observability.addDataProvider(ObservabilityProvider.Client.runtimeMetricsProvider(client.services.services));
    yield* observability.addDataProvider(ObservabilityProvider.Client.spacesMetricsProvider(client));

    if (client.halo.identity.get()) {
      yield* Effect.tryPromise(() => sendPrivacyNotice());
    } else {
      const subscription = client.halo.identity.subscribe(async (identity) => {
        if (identity && observability) {
          await sendPrivacyNotice();
          subscription.unsubscribe();
        }
      });
    }

    return Capability.contributes(ObservabilityCapabilities.Observability, observability, () => observability.close());
  }),
);
