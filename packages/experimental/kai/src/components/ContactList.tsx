//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { FC } from 'react';

import { EchoDatabase, id } from '@dxos/echo-db2';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Contact } from '../proto/tasks';

export const ContactList: FC<{}> = () => {
  const db = useDatabase();
  const contacts = useObjects(db, Contact.filter());

  const handleCreate = async () => {
    await db.save(
      new Contact({
        name: faker.name.findName()
      })
    );
  };

  return (
    <div className='flex-1 m-1 border-2 border-sky-500'>
      <div className='flex'>
        <h2 className='p-2'>Contacts</h2>
        <div className='flex-1' />
        <button className='mr-2' onClick={handleCreate}>
          Create
        </button>
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
    <div>
      <input className='w-full p-1 outline-0' value={person.name} onChange={(e) => (person.name = e.target.value)} />
    </div>
  );
};
