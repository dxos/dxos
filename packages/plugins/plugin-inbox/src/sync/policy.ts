//
// Copyright 2026 DXOS.org
//

/**
 * Mail-sync scheduling policy. Owned by the mail domain rather than by any one provider so every mail
 * connector polls on the same cadence — a provider plugin reads these when declaring its sync trigger.
 */

/** How often a mailbox's sync Routine polls for new mail. */
export const MAIL_SYNC_CRON = '*/10 * * * *';

/**
 * Whether a newly bound mailbox syncs itself instead of waiting for the user to ask. Safe for mail
 * because a first sync is bounded by the binding's sync horizon (`Cursor.resolveHorizon`, 30 days by
 * default) and continues in capped batches through the dispatcher rather than in one unbounded run.
 */
export const MAIL_AUTO_SYNC = true;

/**
 * Whether a mailbox's sync Routine runs on EDGE rather than on the client, so mail keeps arriving
 * while Composer is closed. Each provider's sync operations are in the handler set its workerd plugin
 * entry registers, so EDGE can run them.
 */
export const MAIL_REMOTE_SYNC = true;
