//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { type Observability } from '@dxos/observability';

import {
  AppGraphBuilder,
  ClientReady,
  ObservabilitySettings,
  ObservabilityState,
  OperationResolver,
  ReactSurface,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ClientReadyEvent, ObservabilityEvents } from './types';
import { ObservabilityCapabilities } from './types';

export type ObservabilityPluginOptions = {
  namespace: string;
  observability: () => Promise<Observability>;
};

export const ObservabilityPlugin = Plugin.define<ObservabilityPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ namespace, observability }) => ({
    id: 'observability',
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return Capability.contributes(ObservabilityCapabilities.Observability, obs);
      }),
  })),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: ObservabilitySettings,
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(ObservabilityState),
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [ObservabilityEvents.StateReady],
    activate: () => ObservabilityState({ namespace }),
  })),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(OperationResolver),
    activatesOn: ActivationEvents.SetupOperationResolver,
    activate: () => OperationResolver({ namespace }),
  })),
  Plugin.addModule(({ namespace, observability }) => ({
    id: Capability.getModuleTag(ClientReady),
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.OperationInvokerReady,
      ObservabilityEvents.StateReady,
      ClientReadyEvent,
    ),
    activate: () =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return yield* ClientReady({ namespace, observability: obs });
      }),
  })),
  Plugin.make,
);
