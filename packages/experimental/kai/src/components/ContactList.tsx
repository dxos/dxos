//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { FC } from 'react';

import { EchoDatabase, EchoObject } from '@dxos/echo-db2';

import { id, useDatabase, useObjects, useSelection } from '../hooks';

export const ContactList: FC<{}> = () => {
  const db = useDatabase();
  const contacts = useObjects(db, { type: 'person' });

  const handleCreate = async () => {
    await db.save(
      new EchoObject({
        type: 'person',
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
        {contacts?.map((contact: EchoObject) => (
          <Person key={id(contact)} person={contact} db={db} />
        ))}
      </div>
    </div>
  );
};

export const Person: FC<{ person: EchoObject; db: EchoDatabase }> = ({ person, db }) => {
  useSelection(db, person);

  return (
    <div>
      <input className='w-full p-1 outline-0' value={person.name} onChange={(e) => (person.name = e.target.value)} />
    </div>
  );
};
