//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

/**
 * Verdict of {@link checkTargetAccount}.
 * - `match`: the target is already synced from this account, so its dormant binding may be resumed.
 * - `unknown`: nothing recorded on either side — bind, record, but start the sync from scratch.
 * - `mismatch`: the target holds another account's data; binding it here would merge two accounts.
 */
export type TargetAccountCheck = 'match' | 'unknown' | 'mismatch';

/**
 * The remote account a bindable target (Mailbox, Calendar, …) mirrors, recorded on the target itself as
 * a foreign key `{ source: <service host>, id: <account> }`.
 *
 * The account describes the target, not the binding: it says whose data the object already holds, so it
 * has to outlive both the credential (deleted with its `Connection`) and the cursor. It is what makes
 * "may this binding resume?" answerable, and what stops a mailbox full of one account's mail from being
 * re-bound to another.
 */
export const readTargetAccount = (target: Obj.Unknown, source: string): string | undefined =>
  Obj.getKeys(target, source)[0]?.id;

/** Records the account a target is synced from; a no-op when one is already recorded for `source`. */
export const recordTargetAccount = (target: Obj.Unknown, source: string, account: string): void => {
  if (readTargetAccount(target, source) !== undefined) {
    return;
  }
  Obj.update(target, (target) => {
    Obj.getMeta(target).keys.push({ source, id: account });
  });
};

/**
 * Whether `account` may bind `target`. Refuses only on contradiction: an unrecorded account (every
 * target that predates this record) or a credential that reports no account is not evidence of a match,
 * so it binds without inheriting the dormant binding's progress.
 */
export const checkTargetAccount = (
  target: Obj.Unknown,
  source: string,
  account: string | undefined,
): TargetAccountCheck => {
  const recorded = readTargetAccount(target, source);
  if (recorded === undefined || account === undefined) {
    return 'unknown';
  }
  return recorded === account ? 'match' : 'mismatch';
};
