//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';

import {
  ClientReady,
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

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
//
// `log-downloader` stays inline rather than moving to `#capabilities`: its `provides`/`activate`
// are computed per-instance from `options.downloadLogs` (a raw `Plugin.addModule` module, not a
// maker/`Capability.inlineModule` call), so the generator's static barrel classification can't
// stub it — leaving it here is a no-op under any host that never wires `downloadLogs`, exactly
// matching the node/workerd variants that never contributed it.
export const ObservabilityPlugin = Plugin.define<ObservabilityOptions.ObservabilityPluginOptions>(meta).pipe(
  Plugin.addModule(ClientReady),
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
