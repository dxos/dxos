//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * Fired by the `dependencies` module (via `firesAfterActivation`) once it finishes contributing
 * `WnfsCapabilities.Blockstore`/`Instances`. `blob-backend` activates on this event rather than
 * `ClientEvents.ClientReady` directly — `dependencies` also activates on `ClientReady`, and
 * modules activating on the same event load concurrently with capabilities invisible to each
 * other until the whole batch settles, so `blob-backend` couldn't otherwise be guaranteed to run
 * after `dependencies`.
 */
export const DependenciesReady = ActivationEvent.make(`${meta.profile.key}.event.dependenciesReady`);
