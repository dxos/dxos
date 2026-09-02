//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';
import { ObservabilityCapabilities, ObservabilityEvents, ObservabilityOptions } from '#types';

// `ClientReady` reads `window.performance` and browser-only client metrics; a node host wires its
// own providers when it builds the instance it passes in.
export const ClientReady = Capability.lazyModule(
  'ClientReady',
  {
    environments: [],
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
export const InvocationListener = Capability.lazyModule(
  'InvocationListener',
  {
    requires: [Capabilities.OperationInvoker, AppCapabilities.ObservabilityMapping],
    provides: [],
    // Idle rather than Startup: contributed mappings are read live, so the listener only has to be
    // running before the first user action, not before the plugins that register events.
    activatesOn: ActivationEvents.Idle,
  },
  () => import('./invocation-listener'),
);
export const PrivacyNotice = Capability.lazyModule(
  'PrivacyNotice',
  {
    environments: [],
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
    environments: ['node'],
    provides: [ObservabilityCapabilities.Namespace],
    props: (options: ObservabilityOptions.ObservabilityPluginOptions) => options.namespace,
  },
  (namespace) => Effect.succeed([Capability.contribute(ObservabilityCapabilities.Namespace, namespace)]),
);
export const Observability = Capability.inlineModule(
  'observability',
  {
    environments: ['node'],
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
// `#operation-handler` resolves per condition: workerd has no observability transport of its own
// (see `operation-handler.headless.ts`), so it gets a no-op `SendEvent` handler.
export const OperationHandler = AppCapability.operationHandler(() => import('#operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const ObservabilitySettings = AppCapability.settings(() => import('./settings'), {
  provides: [ObservabilityCapabilities.Settings],
  // The atom is localStorage-backed; a headless host reaches the same state through the
  // observability store instead (see `set-enabled`).
  environments: [],
});
export const ObservabilityState = Capability.lazyModule(
  'ObservabilityState',
  {
    environments: [],
    requires: [Capabilities.AtomRegistry],
    provides: [ObservabilityCapabilities.State],
    props: ({ namespace }: ObservabilityOptions.ObservabilityPluginOptions) => ({ namespace }),
  },
  () => import('./state'),
);
export const Translations = AppCapability.translations(translations);
