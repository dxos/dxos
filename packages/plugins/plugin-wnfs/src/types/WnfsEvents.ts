//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * @deprecated Declare `requires: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances]` instead.
 */
export const DependenciesReady = ActivationEvent.make(`${meta.profile.key}.event.dependenciesReady`);
