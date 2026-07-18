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

/** `Connector.id` for the JMAP mail connector (RFC 8620/8621); stored as `Connection.connectorId`. */
export const JMAP_MAIL_CONNECTOR_ID = 'jmap-mail';

/**
 * Default JMAP server host pre-filled in the credential form. Fastmail is the canonical JMAP
 * provider; the session is discovered at `https://${host}/.well-known/jmap`.
 */
export const JMAP_DEFAULT_HOST = 'api.fastmail.com';

/** Foreign-key `Meta.keys[].source` stamped on synced JMAP messages (dedup key; see jmap mapper). */
export const JMAP_MESSAGE_SOURCE = 'org.ietf.jmap';

export const POPOVER_SAVE_FILTER = DXN.make(`${meta.profile.key}.saveFilterPopover`);

export const MAILBOXES_SECTION_TYPE = `${meta.profile.key}.mailboxes-section`;
export const MAILBOX_DRAFTS_TYPE = `${meta.profile.key}.drafts`;
export const MAILBOX_SUBSCRIPTIONS_TYPE = `${meta.profile.key}.subscriptions`;
