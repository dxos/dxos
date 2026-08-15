//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';
import { ObservabilityCapabilities, ObservabilityEvents, ObservabilityOptions } from '#types';

export const ClientReady = Capability.lazyModule(
  'ClientReady',
  {
    requires: [
      Capabilities.PluginManager,
      Capabilities.OperationInvoker,
      ObservabilityCapabilities.ClientCapability,
      ObservabilityCapabilities.Observability,
      ObservabilityCapabilities.State,
    ],
    provides: [],
    // Reads `client.services` (initialized-only) to wire metrics providers, so it needs the
    // forked client initialization to have completed.
    activatesOn: ObservabilityCapabilities.ClientInitialized,
  },
  () => import('./client-ready'),
);
export const PrivacyNotice = Capability.lazyModule(
  'PrivacyNotice',
  {
    requires: [
      Capabilities.OperationInvoker,
      Capabilities.AtomRegistry,
      ObservabilityCapabilities.State,
      ObservabilityCapabilities.ClientCapability,
    ],
    provides: [],
    // Genuine runtime event: fired imperatively by `plugin-client`'s create-identity operation
    // (mirrored by identifier — see `ObservabilityEvents.IdentityCreatedEvent`).
    activatesOn: ObservabilityEvents.IdentityCreatedEvent,
  },
  () => import('./privacy-notice'),
);
export const Namespace = Capability.inlineModule(
  'namespace',
  {
    provides: [ObservabilityCapabilities.Namespace],
    props: (options: ObservabilityOptions.ObservabilityPluginOptions) => options.namespace,
  },
  (namespace) => Effect.succeed([Capability.contribute(ObservabilityCapabilities.Namespace, namespace)]),
);
export const Observability = Capability.inlineModule(
  'observability',
  {
    provides: [ObservabilityCapabilities.Observability],
    props: (options: ObservabilityOptions.ObservabilityPluginOptions) => options.observability,
  },
  (observability) =>
    Effect.gen(function* () {
      const obs = yield* Effect.tryPromise(() => observability());
      yield* Effect.addFinalizer(() => obs.close());
      return [Capability.contribute(ObservabilityCapabilities.Observability, obs)];
    }),
);
// Node/workerd load a stubbed handler via ./overrides.<env>.ts: neither host can send real
// telemetry (see the overrides files for why), so they register a no-op `SendEvent` handler
// instead of the browser implementation.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  environments: ['browser', 'node', 'workerd'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const ObservabilitySettings = AppCapability.settings(() => import('./settings'), {
  provides: [ObservabilityCapabilities.Settings],
});
export const ObservabilityState = Capability.lazyModule(
  'ObservabilityState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [ObservabilityCapabilities.State],
    props: ({ namespace }: ObservabilityOptions.ObservabilityPluginOptions) => ({ namespace }),
  },
  () => import('./state'),
);
export const Translations = AppCapability.translations(translations);
