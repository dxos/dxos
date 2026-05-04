//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { type Observability, ObservabilityProvider } from '@dxos/observability';

import { meta } from '#meta';
import { ObservabilityOperation } from '#operations';
import { ClientCapability, ObservabilityCapabilities } from '#types';

export type ClientReadyOptions = {
  namespace: string;
  observability: Observability.Observability;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ observability }: ClientReadyOptions) {
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
          id: `${meta.id}.notice`,
          title: ['observability-toast.label', { ns: meta.id }],
          description: ['observability-toast.description', { ns: meta.id }],
          duration: Infinity,
          icon: 'ph--info--regular',
          actionLabel: ['observability-toast-action.label', { ns: meta.id }],
          actionAlt: ['observability-toast-action.alt', { ns: meta.id }],
          closeLabel: ['observability-toast-close.label', { ns: meta.id }],
          onAction: () => invokePromise(SettingsOperation.Open, { plugin: meta.id }),
        });

        registry.set(stateAtom, { ...registry.get(stateAtom), notified: true });
      }
    };

    // Ensure errors are tagged with enabled plugins to help with reproductions.
    const enabledPlugins = manager.getEnabled();
    log('client-ready: tagging enabled plugins', { count: enabledPlugins.length });
    for (const plugin of enabledPlugins) {
      observability.setTags({ [`pluginEnabled-${plugin}`]: 'true' }, 'errors');
    }

    log('client-ready: sending page.load event');
    yield* Effect.tryPromise(() =>
      invokePromise(ObservabilityOperation.SendEvent, {
        name: 'page.load',
        properties: {
          // TODO(wittjosiah): These apis are deprecated. Is there a better way to find this information?
          loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
        },
      }),
    );
    log('client-ready: page.load event sent');

    // Each provider is logged individually because some provider setups perform
    // RPC calls (e.g. runtimeMetricsProvider awaits SystemService.getPlatform());
    // a hung worker pipe surfaces as a missing "added" log, so the last
    // "adding ..." line points to the stall.
    log('client-ready: adding identity data provider');
    yield* observability.addDataProvider(ObservabilityProvider.Client.identityProvider(client.services.services));
    log('client-ready: identity data provider added');

    log('client-ready: adding network metrics data provider');
    yield* observability.addDataProvider(ObservabilityProvider.Client.networkMetricsProvider(client.services.services));
    log('client-ready: network metrics data provider added');

    log('client-ready: adding runtime metrics data provider');
    yield* observability.addDataProvider(ObservabilityProvider.Client.runtimeMetricsProvider(client.services.services));
    log('client-ready: runtime metrics data provider added');

    log('client-ready: adding space metrics data provider');
    yield* observability.addDataProvider(ObservabilityProvider.Client.spacesMetricsProvider(client));
    log('client-ready: space metrics data provider added');

    if (client.halo.identity.get()) {
      log('client-ready: identity present, sending privacy notice');
      yield* Effect.tryPromise(() => sendPrivacyNotice());
      log('client-ready: privacy notice sent');
    } else {
      log('client-ready: no identity, deferring privacy notice');
      const subscription = client.halo.identity.subscribe(async (identity) => {
        if (identity && observability) {
          await sendPrivacyNotice();
          subscription.unsubscribe();
        }
      });
    }

    log('client-ready: contributing observability capability');
    return Capability.contributes(ObservabilityCapabilities.Observability, observability, () => observability.close());
  }),
);
