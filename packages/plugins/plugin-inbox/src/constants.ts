//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/**
 * `Connector.id`s owned by the provider plugins (`@dxos/plugin-google`, `@dxos/plugin-jmap`),
 * duplicated here rather than imported: `types/Mailbox.ts` and `types/Calendar.ts` name their
 * providers in `ConnectorAuthAnnotation`, and importing a provider would invert the dependency. Keep
 * in step with each plugin's own constant until the AUDIT §3.1 inversion lands, at which point
 * providers contribute their ids at registration and these disappear.
 */
export const GMAIL_CONNECTOR_ID = 'gmail';

/** See {@link GMAIL_CONNECTOR_ID}. Owned by `@dxos/plugin-google`. */
export const GOOGLE_CALENDAR_CONNECTOR_ID = 'google-calendar';

/**
 * Google's foreign-key `Meta.keys[].source`, read by `types/DraftEvent.ts` to tell a local draft event
 * from one Google sync has already stamped. Duplicated for the same reason as the connector ids above:
 * a domain type must not import a provider.
 */
export const GOOGLE_INTEGRATION_SOURCE = 'com.google';

/**
 * `Connector.id` for the JMAP mail connector, owned by `@dxos/plugin-jmap`. Duplicated here (rather
 * than imported) because `types/Mailbox.ts` names its providers in `ConnectorAuthAnnotation` — the
 * inversion AUDIT §3.1 tracks. Keep in step with that plugin's `JMAP_MAIL_CONNECTOR_ID`.
 */
export const JMAP_MAIL_CONNECTOR_ID = 'jmap-mail';

export const POPOVER_SAVE_FILTER = DXN.make(`${meta.profile.key}.saveFilterPopover`);

export const MAILBOXES_SECTION_TYPE = `${meta.profile.key}.mailboxes-section`;
export const MAILBOX_SUBSCRIPTIONS_TYPE = `${meta.profile.key}.subscriptions`;
