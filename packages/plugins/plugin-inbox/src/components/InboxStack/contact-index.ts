//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { type Person } from '@dxos/types';

/**
 * Email→contact index for a whole list, built from ONE Person query rather than a query per row —
 * which is why the mailbox tiles can be contact-aware at list cost.
 *
 * Its own module (not the component file) so it can be tested in node: importing the `.tsx` pulls JSX
 * and the React runtime into a test that needs neither.
 */
export const buildContactIndex = (people: readonly Person.Person[]): Map<string, EID.EID> => {
  const byEmail = new Map<string, EID.EID>();
  for (const person of people) {
    const eid = EID.tryParse(Obj.getURI(person).toString());
    if (!eid) {
      continue;
    }
    for (const email of person.emails ?? []) {
      // Addresses are compared case-insensitively: providers routinely vary the case of the local part
      // between messages, and a case-sensitive miss reads to the user as "unknown sender".
      if (email.value) {
        byEmail.set(email.value.toLowerCase(), eid);
      }
    }
  }
  return byEmail;
};
