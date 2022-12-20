//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { PublicKey } from '@dxos/client';
import { EchoDatabase, id } from '@dxos/echo-db2';

import { useObjects, useSelection } from '../hooks';
import { Contact } from '../proto/tasks';

export const ContactList: FC<{ database: EchoDatabase; spaceKey: PublicKey }> = ({ spaceKey, database: db }) => {
  const contacts = useObjects(db, Contact.filter());

  const handleCreate = async () => {
    await db.save(
      new Contact({
        name: ['dima', 'rich', 'zhenya', 'mykola'][Math.floor(Math.random() * 4)]
      })
    );
  };

  return (
    <div>
      <div>
        <h2>Contacts</h2>
        <button onClick={handleCreate}>Create</button>
      </div>

      <div>
        {contacts.map((contact) => (
          <Person key={id(contact)} person={contact} db={db} />
        ))}
      </div>
    </div>
  );
};

export const Person: FC<{ person: Contact; db: EchoDatabase }> = ({ person, db }) => {
  useSelection(db, person);

  return (
    <div style={{ display: 'flex' }}>
      <input value={person.name} onChange={(e) => (person.name = e.target.value)} />
    </div>
  );
};
