//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/** Google Calendar / Gmail foreign-key `Meta.keys[].source` used by inbox sync. */
export const GOOGLE_INTEGRATION_SOURCE = 'google.com';

/** Foreign-key `Meta.keys[].source` stamped on synced Gmail messages (see gmail mapper). */
export const GMAIL_SOURCE = 'gmail.com';

/** `IntegrationProvider.id` for Gmail OAuth / sync; use as `providerId` on `IntegrationAuth` surfaces. */
export const GMAIL_PROVIDER_ID = 'gmail';

/** `IntegrationProvider.id` for Google Calendar OAuth / sync; use as `providerId` on `IntegrationAuth` surfaces. */
export const GOOGLE_CALENDAR_PROVIDER_ID = 'google-calendar';

/** `IntegrationProvider.id` for Google Contacts OAuth / sync; use as `providerId` on `IntegrationAuth` surfaces. */
export const GOOGLE_CONTACTS_PROVIDER_ID = 'google-contacts';

/** `AccessToken.source` prefix for IMAP credentials (full value: `imap:<host>`). */
export const IMAP_INTEGRATION_SOURCE_PREFIX = 'imap';

/** `IntegrationProvider.id` for IMAP mailbox sync. */
export const IMAP_PROVIDER_ID = 'imap';

export const POPOVER_SAVE_FILTER = DXN.make(`${meta.profile.key}.saveFilterPopover`);

export const MAILBOXES_SECTION_TYPE = `${meta.profile.key}.mailboxes-section`;
export const MAILBOX_ALL_MAIL_TYPE = `${meta.profile.key}.all-mail`;
export const MAILBOX_DRAFTS_TYPE = `${meta.profile.key}.drafts`;

/**
 * Sentinel `data` value for the drafts folder graph node. Must be non-null so the nav tree can select it (`handleSelect` skips `!node.data`).
 */
export const MAILBOX_DRAFTS_NODE_DATA = `${meta.profile.key}.drafts-folder` as const;
