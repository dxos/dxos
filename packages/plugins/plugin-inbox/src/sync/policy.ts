//
// Copyright 2026 DXOS.org
//

/**
 * Mail-sync scheduling policy. Owned by the mail domain rather than by any one provider so every mail
 * connector polls on the same cadence — a provider plugin reads these when declaring its sync trigger.
 */

/** How often a mailbox's sync Routine polls for new mail. */
export const MAIL_SYNC_CRON = '*/10 * * * *';

/** Whether a newly bound mailbox syncs itself instead of waiting for the user to ask. */
export const MAIL_AUTO_SYNC = false;
