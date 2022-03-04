//
// Copyright 2020 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';

import { Item, ResultSet } from '../api';
import { PartyInternal, PartyMember } from '../parties';
import { HALO_PARTY_CONTACT_LIST_TYPE } from './halo-party';

// TODO(burdon): Create different class (additional properties).
export type Contact = PartyMember;

/**
 * Manages contacts.
 */
export class ContactManager {
  constructor (
    private readonly _party: PartyInternal
  ) {}

  getContactListItem (): Item<ObjectModel> | undefined {
    return this._party.database.select({ type: HALO_PARTY_CONTACT_LIST_TYPE }).query().entities[0];
  }

  queryContacts (): ResultSet<Contact> {
    const event = new Event();
    const result = this._party.database.select({ type: HALO_PARTY_CONTACT_LIST_TYPE }).query();
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
