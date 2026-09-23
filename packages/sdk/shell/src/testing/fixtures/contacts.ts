//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { PublicKey, SpaceId } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { type Contact, ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type ContactSpace } from '../../components/ContactList/index.ts';

export type ContactFixturesOptions = {
  spaceNames?: string[];
  contactNames?: string[];
};

/**
 * Fake contacts and the spaces they share with the viewer, for stories and tests.
 * Contact `i` shares spaces `0..(i % spaceNames.length)`, so contacts share different numbers of spaces.
 */
export const createContactFixtures = ({
  spaceNames = ['Design', 'Engineering', 'Marketing'],
  contactNames = ['Alice Adams', 'Bob Brown', 'Carol Chen', 'Dan Diaz', 'Eve Evans'],
}: ContactFixturesOptions = {}): { spaces: ContactSpace[]; contacts: Contact[] } => {
  const spaces = spaceNames.map((name) => ({ id: SpaceId.random(), key: PublicKey.random(), name }));
  const contacts = contactNames.map((displayName, index) =>
    create(ContactSchema, {
      identityKey: fromPublicKey(PublicKey.random()),
      profile: create(ProfileDocumentSchema, { displayName }),
      commonSpaces: spaces.slice(0, (index % spaces.length) + 1).map((space) => fromPublicKey(space.key)),
    }),
  );

  return { spaces, contacts };
};
