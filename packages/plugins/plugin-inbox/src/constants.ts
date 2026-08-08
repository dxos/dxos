//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/** Google Calendar / Gmail foreign-key `Meta.keys[].source` used by inbox sync. */
export const GOOGLE_INTEGRATION_SOURCE = 'com.google';

/** Foreign-key `Meta.keys[].source` stamped on synced Gmail messages (see gmail mapper). */
export const GMAIL_SOURCE = 'com.google.mail';

/** `Connector.id` for Gmail OAuth / sync; stored as `Connection.connectorId`. */
export const GMAIL_CONNECTOR_ID = 'gmail';

/** `Connector.id` for Google Calendar OAuth / sync; stored as `Connection.connectorId`. */
export const GOOGLE_CALENDAR_CONNECTOR_ID = 'google-calendar';

/** `Connector.id` for Google Contacts OAuth / sync; stored as `Connection.connectorId`. */
export const GOOGLE_CONTACTS_CONNECTOR_ID = 'google-contacts';

/**
 * `Connector.id` for the JMAP mail connector, owned by `@dxos/plugin-jmap`. Duplicated here (rather
 * than imported) because `types/Mailbox.ts` names its providers in `ConnectorAuthAnnotation` — the
 * inversion AUDIT §3.1 tracks. Keep in step with that plugin's `JMAP_MAIL_CONNECTOR_ID`.
 */
export const JMAP_MAIL_CONNECTOR_ID = 'jmap-mail';

export const POPOVER_SAVE_FILTER = DXN.make(`${meta.profile.key}.saveFilterPopover`);

export const MAILBOXES_SECTION_TYPE = `${meta.profile.key}.mailboxes-section`;
export const MAILBOX_SUBSCRIPTIONS_TYPE = `${meta.profile.key}.subscriptions`;
