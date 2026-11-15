//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { type AuthenticatingInvitationObservable, Invitation_State, InvitationEncoder } from '@dxos/client/invitations';

/** The query parameter Composer reads and writes, so a link opens in either app (spec F-5.2). */
export const INVITATION_PARAM = 'spaceInvitationCode';

/** The invitation code in a pasted link, or the pasted text itself when it is not a link (spec F-3.4). */
export const parseInvitationCode = (text: string): string | undefined => {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return new URL(trimmed).searchParams.get(INVITATION_PARAM) ?? undefined;
  } catch {
    return trimmed;
  }
};

/** Reads the invitation code from the page URL once and removes it, so a reload does not join again. */
export const takeInvitationCode = (): string | undefined => {
  const url = new URL(window.location.href);
  const code = url.searchParams.get(INVITATION_PARAM) ?? undefined;
  if (code) {
    url.searchParams.delete(INVITATION_PARAM);
    window.history.replaceState(null, '', url);
  }
  return code;
};

export const invitationUrl = (code: string, origin: string = window.location.origin): string => {
  const url = new URL(origin);
  url.searchParams.set(INVITATION_PARAM, code);
  return url.toString();
};

/** Starts redeeming an invitation code; throws when the code does not decode. */
export const joinSpace = (client: Client, code: string): AuthenticatingInvitationObservable =>
  client.spaces.join(InvitationEncoder.decode(code));

/**
 * States that end a join. ERROR is not one: the EDGE attempt reports it on a retryable refusal (a space with no
 * agent) while the peer-to-peer attempt carries on; a real failure arrives as an error on the observable.
 */
export const JOIN_FAILED_STATES: ReadonlySet<Invitation_State> = new Set([
  Invitation_State.CANCELLED,
  Invitation_State.EXPIRED,
  Invitation_State.TIMEOUT,
]);

export { Invitation_State };
