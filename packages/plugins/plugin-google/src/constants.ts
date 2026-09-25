//
// Copyright 2026 DXOS.org
//

/** Google Calendar / Gmail foreign-key `Meta.keys[].source` shared by every Google connector. */
export const GOOGLE_INTEGRATION_SOURCE = 'com.google';

/**
 * Foreign-key `Meta.keys[].source` stamped on synced Gmail messages.
 *
 * Note this is NOT the Gmail tag origin domain (`com.google.gmail`, see `operations/mail/tags.ts`):
 * it predates that convention and renaming it would orphan every synced message, so the asymmetry is
 * deliberate. See `Tag.md` §"Origin domain == key source".
 */
export const GMAIL_SOURCE = 'com.google.mail';

/** `Connector.id` for Gmail OAuth / sync; stored as `Connection.connectorId`. */
export const GMAIL_CONNECTOR_ID = 'gmail';

/** `Connector.id` for Google Calendar OAuth / sync; stored as `Connection.connectorId`. */
export const GOOGLE_CALENDAR_CONNECTOR_ID = 'google-calendar';

/** `Connector.id` for Google Contacts OAuth / sync; stored as `Connection.connectorId`. */
export const GOOGLE_CONTACTS_CONNECTOR_ID = 'google-contacts';
