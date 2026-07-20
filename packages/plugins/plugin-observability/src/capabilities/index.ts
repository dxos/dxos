//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { ObservabilityCapabilities, ObservabilityEvents, type ObservabilityPluginOptions } from '#types';

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
    props: (options: ObservabilityPluginOptions) => options.namespace,
  },
  (namespace) => Effect.succeed([Capability.provide(ObservabilityCapabilities.Namespace, namespace)]),
);
export const Observability = Capability.inlineModule(
  'observability',
  {
    provides: [ObservabilityCapabilities.Observability],
    props: (options: ObservabilityPluginOptions) => options.observability,
  },
  (observability) =>
    Effect.gen(function* () {
      const obs = yield* Effect.tryPromise(() => observability());
      return [Capability.provide(ObservabilityCapabilities.Observability, obs, () => obs.close())];
    }),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const ObservabilitySettings = AppCapability.settings(() => import('./settings'), {
  provides: [ObservabilityCapabilities.Settings],
});
export const ObservabilityState = Capability.lazyModule(
  'ObservabilityState',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [ObservabilityCapabilities.State],
    props: ({ namespace }: ObservabilityPluginOptions) => ({ namespace }),
  },
  () => import('./state'),
);
