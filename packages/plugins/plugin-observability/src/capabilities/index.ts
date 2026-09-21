//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';
import { ObservabilityCapabilities, ObservabilityEvents, ObservabilityOptions } from '#types';

export { ClientReady } from './client-ready.ts';
export { InvocationListener } from './invocation-listener.ts';
export { PrivacyNotice } from './privacy-notice.ts';
export const PrivacyBanner = Capability.makeLazyModule(
  'PrivacyBanner',
  {
    environments: ['node'],
    requires: [ObservabilityCapabilities.Namespace],
    provides: [],
    activatesOn: ObservabilityEvents.IdentityCreatedEvent,
  },
  () => import('#privacy-banner'),
);
// `#commands` resolves per condition: only a host with a CLI has anywhere to put them.
export const Commands = AppCapability.lazyCommands(() => import('#commands'));
export const Namespace = Capability.makeModule(
  'namespace',
  {
    environments: ['node'],
    provides: [ObservabilityCapabilities.Namespace],
    props: (options: ObservabilityOptions.ObservabilityPluginOptions) => options.namespace,
  },
  (namespace) => Effect.succeed([Capability.contribute(ObservabilityCapabilities.Namespace, namespace)]),
);
export const Observability = Capability.makeModule(
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
export const OperationHandler = AppCapability.lazyOperationHandler(() => import('#operation-handler'));
export { ReactSurface } from './react-surface.ts';
export { ObservabilitySettings } from './settings.ts';
export { ObservabilityState } from './state.ts';
export const Translations = AppCapability.translations(translations);
