//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent } from '@dxos/app-framework';

/**
 * Mirrors `ClientEvents.IdentityCreated` (`@dxos/plugin-client`) — a genuine runtime event, fired
 * only when an identity is newly created in this session (not recovered/joined). Cloned by
 * identifier to avoid a circular workspace dependency: plugin-client already depends on
 * plugin-observability for `ObservabilityOperation`.
 */
export const IdentityCreatedEvent = ActivationEvent.make('org.dxos.plugin.client.event.identityCreated');
