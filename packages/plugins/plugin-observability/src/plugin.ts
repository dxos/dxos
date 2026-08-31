//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';

import {
  ClientReady,
  InvocationListener,
  Namespace,
  Observability,
  ObservabilitySettings,
  ObservabilityState,
  OperationHandler,
  PrivacyNotice,
  ReactSurface,
  Translations,
} from '#capabilities';
import { meta } from '#meta';
import { ObservabilityCapabilities, ObservabilityOptions } from '#types';

export const ObservabilityPlugin = Plugin.define<ObservabilityOptions.ObservabilityPluginOptions>(meta).pipe(
  Plugin.addModule(ClientReady),
  Plugin.addModule(InvocationListener),
  Plugin.addModule(Namespace),
  Plugin.addModule(Observability),
  Plugin.addModule(ObservabilitySettings),
  Plugin.addModule(ObservabilityState),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PrivacyNotice),
  Plugin.addModule(ReactSurface),
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
