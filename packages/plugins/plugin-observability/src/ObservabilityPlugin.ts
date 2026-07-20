//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import {
  ClientReady,
  Namespace,
  Observability,
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
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(Observability),
  Plugin.addLazyModule(ObservabilitySettings),
  Plugin.addLazyModule(ObservabilityState),
  Plugin.addLazyModule(Namespace),
  Plugin.addModule(({ downloadLogs }: ObservabilityPluginOptions) => ({
    id: 'log-downloader',
    requires: [],
    provides: downloadLogs !== undefined ? [ObservabilityCapabilities.LogDownloader] : [],
    activate: () =>
      Effect.succeed(
        downloadLogs !== undefined ? [Capability.provide(ObservabilityCapabilities.LogDownloader, downloadLogs)] : [],
      ),
  })),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(PrivacyNotice),
  Plugin.addLazyModule(ClientReady),
  Plugin.make,
);

export default ObservabilityPlugin;
