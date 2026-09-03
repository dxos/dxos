//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';

import {
  ClientReady,
  Commands,
  InvocationListener,
  Namespace,
  Observability,
  ObservabilitySettings,
  ObservabilityState,
  OperationHandler,
  PrivacyBanner,
  PrivacyNotice,
  ReactSurface,
  SettingsSync,
  Translations,
} from '#capabilities';
import { meta } from '#meta';
import { ObservabilityCapabilities, ObservabilityOptions } from '#types';

export const ObservabilityPlugin = Plugin.define<ObservabilityOptions.ObservabilityPluginOptions>(meta).pipe(
  Plugin.addModule(ClientReady),
  Plugin.addModule(Commands),
  Plugin.addModule(InvocationListener),
  Plugin.addModule(Namespace),
  Plugin.addModule(Observability),
  Plugin.addModule(ObservabilitySettings),
  Plugin.addModule(ObservabilityState),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PrivacyBanner),
  Plugin.addModule(PrivacyNotice),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(SettingsSync),
  Plugin.addModule(Translations),
  Plugin.addModule(({ downloadLogs }: ObservabilityOptions.ObservabilityPluginOptions) => ({
    id: 'log-downloader',
    requires: [],
    provides: downloadLogs !== undefined ? [ObservabilityCapabilities.LogDownloader] : [],
    activate: () =>
      Effect.succeed(
        downloadLogs !== undefined
          ? [Capability.contribute(ObservabilityCapabilities.LogDownloader, downloadLogs)]
          : [],
      ),
  })),
  Plugin.make,
);

export default ObservabilityPlugin;
