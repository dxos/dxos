//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';

import { ResultSet } from '../api';
import { Database, Item } from '../packlets/database';
import { IdentityNotInitializedError } from '../packlets/errors';
import { PartyMember } from '../parties';
import { HALO_PARTY_CONTACT_LIST_TYPE } from './halo-party';

// TODO(burdon): Create different class (additional properties).
export type Contact = PartyMember;

/**
 * Manages contacts.
 */
export class ContactManager {
  constructor (
    private readonly _getDatabase: () => Database | undefined
  ) {}

  getContactListItem (): Item<ObjectModel> | undefined {
    const database = this._getDatabase() ?? raise(new IdentityNotInitializedError());
    return database.select({ type: HALO_PARTY_CONTACT_LIST_TYPE }).exec().entities[0];
  }

  queryContacts (): ResultSet<Contact> {
    const database = this._getDatabase() ?? raise(new IdentityNotInitializedError());
    const event = new Event();
    const result = database.select({ type: HALO_PARTY_CONTACT_LIST_TYPE }).exec();
    result.update.on(() => {
      event.emit();
    });

    const getter = (): Contact[] => {
      const [contactListItem] = result.entities;
      const contacts = contactListItem?.model.toObject();
      return Object.values(contacts ?? {}).map((contact: any) => ({
        publicKey: PublicKey.from(contact.publicKey._value),
        displayName: contact.displayName
      }));
    };

    return new ResultSet(event, getter);
  }
}
