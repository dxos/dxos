//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export const ComputeRuntimeReady = ActivationEvent.make(`${meta.id}.event.compute-runtime-ready`);
