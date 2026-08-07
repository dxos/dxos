//
// Copyright 2026 DXOS.org
//

import { type IdentityIndex } from '@dxos/extractor';
import { Organization } from '@dxos/types';

import { normalizeEmail } from './identity';

/**
 * Local parts that are never a person: automated senders and bounce handlers. The separator inside
 * the phrase is optional and may be `-` or `_` — real senders use both (`testflight_no_reply@`).
 */
const NO_REPLY_RE = /(^|[._+-])(no[-_]?reply|do[-_]?not[-_]?reply|mailer[-_]?daemon|bounces?)([._+-]|$)/i;

/** Local parts belonging to a role mailbox rather than an individual. */
const ROLE_LOCALPART_RE =
  /^(admin|billing|contact|help|hello|info|marketing|news(letter)?|notifications?|office|orders?|sales|security|support|team|updates?)$/i;

/** Signals a message carries about its sender, drawn from headers by the provider's mapper. */
export type SenderSignals = {
  /** We sent or replied to this address — the strongest possible signal that it matters. */
  readonly outbound?: boolean;
  /** The sender address is a no-reply mailbox (`properties.noReply`). */
  readonly noReply?: boolean;
  /** The message carries `List-Unsubscribe` (`properties.listUnsubscribe`) — bulk mail. */
  readonly listUnsubscribe?: string;
  /** `Precedence: bulk|list|junk` or `Auto-Submitted` — machine-generated mail. */
  readonly bulk?: boolean;
};

/**
 * Whether a sender is worth materialising as a Person.
 *
 * The cheapest fix for duplicate volume is not creating the object at all: a mailbox is mostly
 * automated senders, and each one becomes a Person nobody will ever look at (and another candidate
 * for the duplicates review). This is an allow-list — a sender must earn a record:
 *
 *  1. we sent or replied to the address, or
 *  2. its domain matches an Organization the space already knows,
 *
 * and never when the address or the message is machine-generated (no-reply, bulk, list mail, role
 * mailbox). Deny beats allow, so a newsletter from a known Organization is still skipped.
 */
export const shouldExtractContact = (
  email: string | undefined,
  signals: SenderSignals,
  index: IdentityIndex,
): boolean => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }

  const localPart = normalized.split('@')[0] ?? '';
  const automated =
    signals.noReply === true ||
    signals.bulk === true ||
    (signals.listUnsubscribe?.length ?? 0) > 0 ||
    NO_REPLY_RE.test(localPart) ||
    ROLE_LOCALPART_RE.test(localPart);
  if (automated) {
    return false;
  }

  return signals.outbound === true || index.lookup(Organization.Organization, { email: normalized }) !== undefined;
};
