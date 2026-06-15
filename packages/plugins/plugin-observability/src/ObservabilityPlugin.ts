//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { type Observability } from '@dxos/observability';

import {
  ClientReady,
  ObservabilitySettings,
  ObservabilityState,
  OperationHandler,
  PrivacyNotice,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { ObservabilityCapabilities, ObservabilityEvents } from '#types';

export type ObservabilityPluginOptions = {
  namespace: string;
  observability: () => Promise<Observability.Observability>;
  /**
   * Optional callback invoked by the help/feedback UI to download captured logs.
   * When omitted the "Download logs" action is hidden.
   */
  downloadLogs?: () => void | Promise<void>;
};

export const ObservabilityPlugin = Plugin.define<ObservabilityPluginOptions>(meta).pipe(
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ observability }) => ({
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
    firesAfterActivation: [ObservabilityEvents.StateReady],
    activate: () => ObservabilityState({ namespace }),
  })),
  Plugin.addModule(({ namespace }) => ({
    id: 'namespace',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(ObservabilityCapabilities.Namespace, namespace)),
  })),
  Plugin.addModule(({ downloadLogs }) => ({
    id: 'log-downloader',
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.succeed(
        downloadLogs !== undefined ? Capability.contributes(ObservabilityCapabilities.LogDownloader, downloadLogs) : [],
      ),
  })),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.addModule({
    activatesOn: ActivationEvent.make('org.dxos.plugin.client.event.identity-created'),
    activate: PrivacyNotice,
  }),
  Plugin.addModule(({ namespace, observability }) => ({
    id: Capability.getModuleTag(ClientReady),
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.ProcessManagerReady,
      ObservabilityEvents.StateReady,
      ObservabilityEvents.ClientReadyEvent,
    ),
    activate: () =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return yield* ClientReady({ namespace, observability: obs });
      }),
  })),
  Plugin.make,
);

export default ObservabilityPlugin;
