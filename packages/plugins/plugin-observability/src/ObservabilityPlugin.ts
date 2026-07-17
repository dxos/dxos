//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
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
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ observability }) => ({
    id: 'observability',
    requires: [],
    provides: [ObservabilityCapabilities.Observability],
    activate: () =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return [Capability.provide(ObservabilityCapabilities.Observability, obs, () => obs.close())];
      }),
  })),
  Plugin.addModule({
    requires: ObservabilitySettings.requires,
    provides: ObservabilitySettings.provides,
    activate: ObservabilitySettings,
  }),
  Plugin.addModule(({ namespace }) => ({
    id: Capability.getModuleTag(ObservabilityState),
    requires: ObservabilityState.requires,
    provides: ObservabilityState.provides,
    // Migration bridge for any unmigrated `StateReady` listener.
    compatFires: [ObservabilityEvents.StateReady],
    activate: () => ObservabilityState({ namespace }),
  })),
  Plugin.addModule(({ namespace }) => ({
    id: 'namespace',
    requires: [],
    provides: [ObservabilityCapabilities.Namespace],
    activate: () => Effect.succeed([Capability.provide(ObservabilityCapabilities.Namespace, namespace)]),
  })),
  Plugin.addModule(({ downloadLogs }) => ({
    id: 'log-downloader',
    requires: [],
    provides: downloadLogs !== undefined ? [ObservabilityCapabilities.LogDownloader] : [],
    activate: () =>
      Effect.succeed(
        downloadLogs !== undefined ? [Capability.provide(ObservabilityCapabilities.LogDownloader, downloadLogs)] : [],
      ),
  })),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  // Genuine runtime event: fired imperatively by `plugin-client`'s create-identity operation
  // (mirrored by identifier — see `ObservabilityEvents.IdentityCreatedEvent`).
  Plugin.addModule({
    id: Capability.getModuleTag(PrivacyNotice),
    activatesOn: ObservabilityEvents.IdentityCreatedEvent,
    requires: PrivacyNotice.requires,
    provides: PrivacyNotice.provides,
    activate: PrivacyNotice,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ClientReady),
    requires: ClientReady.requires,
    provides: ClientReady.provides,
    activate: ClientReady,
  }),
  Plugin.make,
);

export default ObservabilityPlugin;
