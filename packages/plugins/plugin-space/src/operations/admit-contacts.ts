//
// Copyright 2026 DXOS.org
//

import { type Space, type SpaceMember_Role } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

export type AdmitContactsResult = { admitted: string[]; failed: { key: string; error: string }[] };

/** Admits sequentially so one rejected key is reported without abandoning the rest. */
export const admitContacts = async (
  space: Pick<Space, 'admitContact'>,
  identityKeys: string[],
  role: SpaceMember_Role,
): Promise<AdmitContactsResult> => {
  const result: AdmitContactsResult = { admitted: [], failed: [] };
  for (const key of identityKeys) {
    try {
      await space.admitContact(createBuf(ContactSchema, { identityKey: fromPublicKey(PublicKey.from(key)) }), role);
      result.admitted.push(key);
    } catch (error) {
      result.failed.push({ key, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
};
