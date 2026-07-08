//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Type } from '@dxos/echo';

import * as Profile from './Profile';

/**
 * Catalog of known user profiles.
 * Replaces the legacy `ContactsService`, which derived contacts on the fly from space memberships;
 * the address book is instead explicit, persistent application data owned by the identity.
 *
 * Entries reference display profiles only; to make a contact actionable (invitable to a group)
 * the entry must also carry the contact's Keyhive `ContactCard` — see {@link Profile}.
 *
 * BlueSky/atproto overlap: functionally the analogue of the atproto follow/contact graph, keyed
 * by DID. Contact discovery (handle or email → DID/ContactCard lookup) is a HALO Hub service
 * concern layered on top of this schema, comparable to atproto handle resolution via PDS/PLC.
 */
export class AddressBook extends Type.makeObject<AddressBook>(DXN.make('org.dxos.halo.addressBook', '0.1.0'))(
  Schema.Struct({
    contacts: Schema.Array(Ref.Ref(Profile.Profile)),
  }),
) {}

export const make = (props: Obj.MakeProps<typeof AddressBook>): AddressBook => Obj.make(AddressBook, props);
