//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ObservabilityProvider } from '@dxos/observability';

import { ObservabilityCapabilities, ObservabilityOperation } from '#types';

// The `observability` instance is read from `ObservabilityCapabilities.Observability` (contributed
// once, at Startup, by the `observability` module) rather than re-created here — a capability is a
// singleton and two independent contributions would trigger `DuplicateProviderError`.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capabilities.PluginManager;
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const client = yield* ObservabilityCapabilities.ClientCapability;
    const observability = yield* ObservabilityCapabilities.Observability;

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

    return [];
  }),
);
