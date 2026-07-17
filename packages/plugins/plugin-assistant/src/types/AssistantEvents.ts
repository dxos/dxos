//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

/** @deprecated Ordering-only; declare `requires: [AppCapabilities.AiModelResolver]` instead. */
export const SetupAiServiceProviders = ActivationEvent.make(`${meta.profile.key}.event.setupAiServiceProviders`);
