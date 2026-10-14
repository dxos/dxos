//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { type Space, SpaceMember_Role } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

export type CreateFakeContactsOptions = {
  /** Names of the spaces to create; contacts are spread across them. */
  spaceNames?: string[];
  /** Display names of the contacts to admit. */
  contactNames?: string[];
};

/**
 * Populate the contact book with fake people by admitting random identities to new named spaces.
 * The contact book is derived from space membership, so this exercises the real `useContacts` path.
 * Contact `i` joins spaces `0..(i % spaceNames.length)`, so contacts share different numbers of spaces.
 */
export const createFakeContacts = (
  client: Client,
  {
    spaceNames = ['Design', 'Engineering', 'Marketing'],
    contactNames = ['Alice Adams', 'Bob Brown', 'Carol Chen', 'Dan Diaz', 'Eve Evans'],
  }: CreateFakeContactsOptions = {},
): Effect.Effect<Space[], never, never> =>
  Effect.gen(function* () {
    const spaces: Space[] = [];
    for (const name of spaceNames) {
      const space = yield* Effect.promise(() => client.spaces.create());
      yield* Effect.promise(() => space.waitUntilReady());
      Obj.update(space.properties, (properties) => {
        properties.name = name;
      });
      spaces.push(space);
    }

    for (const [index, displayName] of contactNames.entries()) {
      const contact = create(ContactSchema, {
        identityKey: fromPublicKey(PublicKey.random()),
        profile: create(ProfileDocumentSchema, { displayName }),
      });
      for (const space of spaces.slice(0, (index % spaces.length) + 1)) {
        yield* Effect.promise(() => space.admitContact(contact, SpaceMember_Role.EDITOR));
      }
    }

    return spaces;
  });
