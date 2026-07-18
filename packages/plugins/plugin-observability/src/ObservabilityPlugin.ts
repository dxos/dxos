//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

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
import { ObservabilityCapabilities, type ObservabilityPluginOptions } from '#types';

export type { ObservabilityPluginOptions } from '#types';

export const ObservabilityPlugin = Plugin.define<ObservabilityPluginOptions>(meta).pipe(
  AppPlugin.addSurfaceModule<ObservabilityPluginOptions>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<ObservabilityPluginOptions>({ translations }),
  Plugin.addModule(({ observability }: ObservabilityPluginOptions) => ({
    id: 'observability',
    requires: [],
    provides: [ObservabilityCapabilities.Observability],
    activate: () =>
      Effect.gen(function* () {
        const obs = yield* Effect.tryPromise(() => observability());
        return [Capability.provide(ObservabilityCapabilities.Observability, obs, () => obs.close())];
      }),
  })),
  Plugin.addLazyModule(ObservabilitySettings),
  Plugin.addLazyModule(ObservabilityState),
  Plugin.addModule(({ namespace }: ObservabilityPluginOptions) => ({
    id: 'namespace',
    requires: [],
    provides: [ObservabilityCapabilities.Namespace],
    activate: () => Effect.succeed([Capability.provide(ObservabilityCapabilities.Namespace, namespace)]),
  })),
  Plugin.addModule(({ downloadLogs }: ObservabilityPluginOptions) => ({
    id: 'log-downloader',
    requires: [],
    provides: downloadLogs !== undefined ? [ObservabilityCapabilities.LogDownloader] : [],
    activate: () =>
      Effect.succeed(
        downloadLogs !== undefined ? [Capability.provide(ObservabilityCapabilities.LogDownloader, downloadLogs)] : [],
      ),
  })),
  AppPlugin.addOperationHandlerModule<ObservabilityPluginOptions>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  Plugin.addLazyModule(PrivacyNotice),
  Plugin.addLazyModule(ClientReady),
  Plugin.make,
);

export default ObservabilityPlugin;
