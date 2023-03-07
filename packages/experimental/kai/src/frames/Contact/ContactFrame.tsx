//
// Copyright 2023 DXOS.org
//

import { UserCircle } from 'phosphor-react';
import React, { FC, ReactNode } from 'react';

import { Address, Contact } from '@dxos/kai-types';
import { useQuery } from '@dxos/react-client';
import { Button, getSize } from '@dxos/react-components';

import { useAppRouter } from '../../hooks';

// TODO(burdon): Replace ContactCard (and reuse in Calendar).

const AddressSection: FC<{ address: Address }> = ({ address }) => {
  return (
    <div className='mt-2 text-sm text-zinc-600'>
      <div>{address.city}</div>
      <div>
        {address.state} {address.zip}
      </div>
    </div>
  );
};

const Row: FC<{ children: ReactNode; gutter?: ReactNode }> = ({ children, gutter }) => {
  return (
    <div className='flex overflow-hidden items-center'>
      <div className='flex shrink-0 w-[48px]'>{gutter}</div>
      <div className='text-lg'>{children}</div>
    </div>
  );
};

const Card: FC<{ contact: Contact }> = ({ contact }) => {
  return (
    <div className='flex flex-col w-[320px] overflow-hidden p-1 py-2 pb-3 bg-white border rounded-lg'>
      <Row
        gutter={
          <Button variant='ghost'>
            <UserCircle weight='thin' className={getSize(6)} />
          </Button>
        }
      >
        <div className='text-lg'>{contact.name}</div>
      </Row>

      {contact.email !== undefined ||
        (contact.username !== undefined && (
          <Row>
            <div className='flex flex-col mt-2 text-sm'>
              {contact.email && <div className='text-sky-700'>{contact.email}</div>}
              {contact.username && <div className='text-sky-700'>{contact.username}</div>}
              {contact.phone && <div>{contact.phone}</div>}
            </div>
          </Row>
        ))}

      {contact.address && (
        <Row>
          <AddressSection address={contact.address} />
        </Row>
      )}
    </div>
  );
};

const sort = ({ name: a }: Contact, { name: b }: Contact) => (a < b ? -1 : a > b ? 1 : 0);

// TODO(burdon): Colored tags.
// TODO(burdon): Recent messages.
// TODO(burdon): Tasks.
export const ContactFrame = () => {
  const { space } = useAppRouter();
  const contacts = useQuery(space, Contact.filter()).sort(sort);

  return (
    <div className='flex flex-1 overflow-x-scroll'>
      <div className='flex flex-col flex-wrap m-4'>
        {contacts.map((contact) => (
          <div key={contact.id} className='mb-2 mr-2'>
            <Card contact={contact} />
          </div>
        ))}
      </div>
    </div>
  );
};
