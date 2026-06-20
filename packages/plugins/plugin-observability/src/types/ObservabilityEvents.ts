//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(meta.profile.key);

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
export const ClientReadyEvent = ActivationEvent.make('org.dxos.plugin.client.event.clientReady');
