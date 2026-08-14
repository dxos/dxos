//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/**
 * Google's foreign-key `Meta.keys[].source`, read by `types/DraftEvent.ts` to tell a local draft event
 * from one Google sync has already stamped. Still duplicated from `@dxos/plugin-google` because a
 * domain type must not import a provider; unlike the connector ids (now resolved from the registry —
 * see `connectorIdsForTarget`), a foreign-key source has no registry to resolve through.
 */
export const GOOGLE_INTEGRATION_SOURCE = 'com.google';

export const POPOVER_SAVE_FILTER = DXN.make(`${meta.profile.key}.saveFilterPopover`);

export const MAILBOXES_SECTION_TYPE = `${meta.profile.key}.mailboxes-section`;
export const MAILBOX_SUBSCRIPTIONS_TYPE = `${meta.profile.key}.subscriptions`;
