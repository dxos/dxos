//
// Copyright 2026 DXOS.org
//

import { type IdentityIndex } from '@dxos/extractor';
import { type Message, Organization } from '@dxos/types';

import { normalizeEmail } from './identity.ts';

/**
 * Local parts that are never a person: automated senders and bounce handlers. The separator inside
 * the phrase is optional and may be `-` or `_` — real senders use both (`testflight_no_reply@`).
 */
const NO_REPLY_RE = /(^|[._+-])(no[-_]?reply|do[-_]?not[-_]?reply|mailer[-_]?daemon|bounces?)([._+-]|$)/i;

/**
 * Local parts belonging to a role mailbox rather than an individual. Matched as a PREFIX followed by
 * an optional separator, not an exact equality: real bulk senders qualify the role word
 * (`invoice+statements+acct_1abc@stripe.com`, `payments-noreply@`, `no.reply@`), and an exact-match
 * pattern let every one of those through.
 */
const ROLE_LOCALPART_RE =
  /^(admin|alerts?|billing|careers?|community|contact|deals|digest|feedback|help(desk)?|hello|info|invoices?|jobs|mailer|marketing|members?|membership|news(letter)?|notice|notifications?|notify|offers|office|orders?|payments?|postmaster|promo(tions)?|prospectus|receipts?|renewals?|sales|security|service|shipping|success|support|survey|team|updates?|webmaster|website|welcome)([._+-]|$)/i;

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
  if (isAutomatedSender(normalized, signals)) {
    return false;
  }

  return signals.outbound === true || index.lookup(Organization.Organization, { email: normalized }) !== undefined;
};

/**
 * The DENY half of {@link shouldExtractContact}, on its own: the sender is a machine, not a person.
 *
 * Separated because the two halves answer different questions. A caller extracting in BULK over a
 * whole mailbox needs the full allow-list (a sender must earn a record), while a caller acting on one
 * message — the Contact extractor, an explicit "extract this sender" — has already decided the sender
 * is interesting and only needs protecting from the obvious machines. Without this split the extractor
 * ran ungated and filled the space with `no-reply@`, `mailer-daemon@` and `invoice+statements@` people.
 */
export const isAutomatedSender = (email: string | undefined, signals: SenderSignals = {}): boolean => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }
  const localPart = normalized.split('@')[0] ?? '';
  return (
    signals.noReply === true ||
    signals.bulk === true ||
    (signals.listUnsubscribe?.length ?? 0) > 0 ||
    NO_REPLY_RE.test(localPart) ||
    ROLE_LOCALPART_RE.test(localPart)
  );
};

/**
 * The sender signals a message carries, as recorded on `properties` by the provider's mapper
 * (`Precedence`/`Auto-Submitted` are folded into `bulk` there). Shared so every extraction path reads
 * the same fields — it was duplicated per caller, and a path that forgot them extracted everything.
 */
export const senderSignals = (message: Message.Message): SenderSignals => {
  const properties = message.properties ?? {};
  return {
    noReply: properties.noReply === true,
    listUnsubscribe: typeof properties.listUnsubscribe === 'string' ? properties.listUnsubscribe : undefined,
    bulk: properties.bulk === true,
  };
};
