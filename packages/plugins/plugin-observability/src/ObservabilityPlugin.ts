//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
import { type Observability } from '@dxos/observability';

import {
  AppGraphBuilder,
  ClientReady,
  IntentResolver,
  ObservabilitySettings,
  ObservabilityState,
  OperationHandler,
  ReactSurface,
} from './capabilities';
import { ClientReadyEvent, ObservabilityEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { ObservabilityCapabilities } from './types';

export type ObservabilityPluginOptions = {
  namespace: string;
  observability: () => Promise<Observability>;
};

export const ObservabilityPlugin = Plugin.define<ObservabilityPluginOptions>(meta).pipe(
  Plugin.addModule(({ namespace, observability }) => ({
    id: 'observability',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return Capability.contributes(ObservabilityCapabilities.Observability, obs);
      }),
  })),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: ObservabilitySettings,
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(ObservabilityState),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [ObservabilityEvents.StateReady],
    activate: () => ObservabilityState({ namespace }),
  })),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(IntentResolver),
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: (context) => IntentResolver({ context, namespace }),
  })),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(OperationHandler),
    activatesOn: Common.ActivationEvent.SetupOperationHandler,
    activate: (context) => OperationHandler({ context, namespace }),
  })),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule(({ namespace, observability }) => ({
    id: Capability.getModuleTag(ClientReady),
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.DispatcherReady,
      ObservabilityEvents.StateReady,
      ClientReadyEvent,
    ),
    activate: (context) =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return yield* ClientReady({ context, namespace, observability: obs });
      }),
  })),
  Plugin.make,
);
