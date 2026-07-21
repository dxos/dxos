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
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(Observability),
  Plugin.addModule(ObservabilitySettings),
  Plugin.addModule(ObservabilityState),
  Plugin.addModule(Namespace),
  Plugin.addModule(({ downloadLogs }: ObservabilityPluginOptions) => ({
    id: 'log-downloader',
    requires: [],
    provides: downloadLogs !== undefined ? [ObservabilityCapabilities.LogDownloader] : [],
    activate: () =>
      Effect.succeed(
        downloadLogs !== undefined ? [Capability.provide(ObservabilityCapabilities.LogDownloader, downloadLogs)] : [],
      ),
  })),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PrivacyNotice),
  Plugin.addModule(ClientReady),
  Plugin.make,
);

export default ObservabilityPlugin;
