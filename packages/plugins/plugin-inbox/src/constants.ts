//
// Copyright 2025 DXOS.org
//

import { meta } from '#meta';

/** Google Calendar / Gmail foreign-key `Meta.keys[].source` used by inbox sync. */
export const GOOGLE_INTEGRATION_SOURCE = 'google.com';

/** `IntegrationProvider.id` for Gmail OAuth / sync; use as `providerId` on `integration--auth` surfaces. */
export const GMAIL_PROVIDER_ID = 'gmail';

/** `IntegrationProvider.id` for Google Calendar OAuth / sync; use as `providerId` on `integration--auth` surfaces. */
export const GOOGLE_CALENDAR_PROVIDER_ID = 'google-calendar';

export const POPOVER_SAVE_FILTER = `${meta.id}.SaveFilterPopover`;

export const MAILBOXES_SECTION_TYPE = `${meta.id}.mailboxes-section`;
export const MAILBOX_ALL_MAIL_TYPE = `${meta.id}.all-mail`;
export const MAILBOX_DRAFTS_TYPE = `${meta.id}.drafts`;

/**
 * Sentinel `data` value for the drafts folder graph node. Must be non-null so the nav tree can select it (`handleSelect` skips `!node.data`).
 */
export const MAILBOX_DRAFTS_NODE_DATA = `${meta.id}.drafts-folder` as const;
