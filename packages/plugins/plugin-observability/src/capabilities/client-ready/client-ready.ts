//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, SettingsOperation } from '@dxos/app-framework';
import { type Observability, setupTelemetryListeners } from '@dxos/observability';

import { meta } from '../../meta';
import { ClientCapability, ObservabilityCapabilities, ObservabilityOperation } from '../../types';

type ClientReadyOptions = {
  namespace: string;
  observability: Observability;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: ClientReadyOptions) {
    const { namespace, observability } = props!;
    const manager = yield* Capability.get(Common.Capability.PluginManager);
    const { invokePromise } = yield* Capability.get(Common.Capability.OperationInvoker);
    const state = yield* Capability.get(ObservabilityCapabilities.State);
    const client = yield* Capability.get(ClientCapability);

    const sendPrivacyNotice = async () => {
      const environment = client?.config?.values.runtime?.app?.env?.DX_ENVIRONMENT;
      const notify =
        environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');
      if (!state.notified && notify) {
        await invokePromise(Common.LayoutOperation.AddToast, {
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

        state.notified = true;
      }
    };

    // Ensure errors are tagged with enabled plugins to help with reproductions.
    const enabledPlugins = manager.getEnabled();
    for (const plugin of enabledPlugins) {
      observability?.setTag(`pluginEnabled-${plugin}`, 'true', 'errors');
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

    // Start client observability (i.e. not running as shared worker)
    // TODO(nf): how to prevent multiple instances for single shared worker?
    const cleanup = setupTelemetryListeners(namespace, client, observability);

    yield* Effect.tryPromise(() =>
      Promise.all([
        observability.setIdentityTags(client.services.services),
        observability.startRuntimeMetrics(client),
        observability.startNetworkMetrics(client.services.services),
        observability.startSpacesMetrics(client, namespace),
      ]),
    );

    if (client.halo.identity.get()) {
      yield* Effect.tryPromise(() => sendPrivacyNotice());
    } else {
      const subscription = client.halo.identity.subscribe(async (identity) => {
        if (identity && observability) {
          await sendPrivacyNotice();
          await observability.setIdentityTags(client.services.services);
          subscription.unsubscribe();
        }
      });
    }

    return Capability.contributes(ObservabilityCapabilities.Observability, observability, () =>
      Effect.tryPromise(async () => {
        cleanup();
        await observability.close();
      }),
    );
  }),
);
