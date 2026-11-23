//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ObservabilityCapabilities, type ObservabilityOptions } from '#types';

export default Capability.makeModule(({ downloadLogs }: ObservabilityOptions.ObservabilityPluginOptions) =>
  Effect.succeed(
    downloadLogs !== undefined ? [Capability.contribute(ObservabilityCapabilities.LogDownloader, downloadLogs)] : [],
  ),
);
