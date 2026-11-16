//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Space } from '@dxos/halo';
import {
  type Contact,
  useContacts,
  useHaloServices,
  useMembers,
} from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';

import { Person } from './ui.tsx';

/** The members of one space, before the app lists contacts. */
export const Members = ({ spaceId }: { spaceId: SpaceId }) => {
  const members = useMembers(spaceId);
  return (
    <ul className='cb-list'>
      {members.map((member) => (
        <li key={member.did ?? member.identityKey} className='cb-item'>
          <Person name={member.displayName} online={member.online} />
        </li>
      ))}
    </ul>
  );
};

/** Everyone you share a space with, once each, with the spaces you share. */
export const Contacts = () => {
  const services = useHaloServices();

  // #region contacts
  /** Everyone you share a space with, re-rendering on each change. */
  const contacts = useContacts();
  // #endregion

  // #region remove
  /** Removes `contact` from `space`. */
  const handleRemove = (contact: Contact, space: Space.Info) =>
    Space.removeMember(space.id, contact.did).pipe(
      Effect.provide(services),
      Effect.runPromise,
    );
  // #endregion

  return contacts.length === 0 ? (
    <p className='cb-muted'>
      No contacts yet. Make a space and invite someone to it.
    </p>
  ) : (
    <ul className='cb-list'>
      {contacts.map((contact) => (
        <li key={contact.did} className='cb-item'>
          <Person name={contact.displayName} online={contact.online} />
          <span className='cb-spaces'>
            {contact.spaces.map((space) => (
              <span key={space.id} className='cb-tag'>
                {space.name}
                <button
                  className='cb-remove'
                  title={`Remove ${contact.displayName ?? 'them'} from ${space.name}`}
                  onClick={() => handleRemove(contact, space)}
                >
                  ×
                </button>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
};
