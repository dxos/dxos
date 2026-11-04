//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ObservabilityCapabilities, type ObservabilityOptions } from '#types';

export default Capability.makeModule(({ namespace }: ObservabilityOptions.ObservabilityPluginOptions) =>
  Effect.succeed([Capability.contribute(ObservabilityCapabilities.Namespace, namespace)]),
);
