//
// Copyright 2026 DXOS.org
//

import { type Space, type SpaceMember_Role } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

export type AdmitContactsResult = { admitted: string[]; failed: { key: string; error: string }[] };

/**
 * Admits sequentially so one rejected key is reported without abandoning the rest.
 * A key found in `knownContacts` is admitted with that contact's profile, so the member is named before they join.
 */
export const admitContacts = async (
  space: Pick<Space, 'admitContact'>,
  identityKeys: string[],
  role: SpaceMember_Role,
  knownContacts: Contact[] = [],
): Promise<AdmitContactsResult> => {
  const result: AdmitContactsResult = { admitted: [], failed: [] };
  for (const key of identityKeys) {
    try {
      const contact =
        knownContacts.find((known) => toPublicKey(known.identityKey)?.toHex() === key) ??
        createBuf(ContactSchema, { identityKey: fromPublicKey(PublicKey.from(key)) });
      await space.admitContact(contact, role);
      result.admitted.push(key);
    } catch (error) {
      result.failed.push({ key, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
};
