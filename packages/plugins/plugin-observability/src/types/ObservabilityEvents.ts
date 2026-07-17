//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(meta.profile.key);

/**
 * Mirrors `ClientEvents.IdentityCreated` (`@dxos/plugin-client`) — a genuine runtime event, fired
 * only when an identity is newly created in this session (not recovered/joined). Cloned by
 * identifier to avoid a circular workspace dependency: plugin-client already depends on
 * plugin-observability for `ObservabilityOperation`.
 */
export const IdentityCreatedEvent = ActivationEvent.make('org.dxos.plugin.client.event.identityCreated');

/** @deprecated Ordering-only; declare `requires: [ObservabilityCapabilities.ClientCapability]` instead. */
// NOTE: This is cloned from the client plugin to avoid circular dependencies.
export const ClientReadyEvent = ActivationEvent.make('org.dxos.plugin.client.event.clientReady');
