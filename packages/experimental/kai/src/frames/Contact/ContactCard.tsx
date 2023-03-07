//
// Copyright 2023 DXOS.org
//

import { ArrowCircleRight, UserCircle, UserCirclePlus } from 'phosphor-react';
import React, { FC, ReactNode } from 'react';

import { Address, Contact } from '@dxos/kai-types';
import { Button, getSize, mx } from '@dxos/react-components';

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

const Row: FC<{ children: ReactNode; gutter?: ReactNode; action?: ReactNode }> = ({ children, gutter, action }) => {
  return (
    <div className='flex overflow-hidden items-center'>
      <div className='flex shrink-0 w-[48px]'>{gutter}</div>
      <div className='flex w-full'>{children}</div>
      {action && <div className='flex shrink-0 w-[48px]'>{action}</div>}
    </div>
  );
};

export const ContactCard: FC<{
  contact: Contact;
  selected?: boolean;
  temporary?: boolean; // TODO(burdon): Enable Icon override instead.
  onSelect?: (contact: Contact) => void;
  onAction?: (contact: Contact) => void;
}> = ({ contact, selected, temporary, onSelect, onAction }) => {
  const name = contact.name ?? contact.email;

  return (
    <div className='flex flex-col w-column overflow-hidden p-1 py-2 space-y-2 bg-white border-b md:border md:rounded-lg'>
      <Row
        gutter={
          <Button variant='ghost' onClick={() => onSelect?.(contact)}>
            {(temporary && <UserCirclePlus weight='thin' className={getSize(6)} />) || (
              <UserCircle className={mx(getSize(6), 'text-sky-600')} />
            )}
          </Button>
        }
        action={
          onAction && (
            <Button variant='ghost' onClick={() => onAction?.(contact)}>
              <ArrowCircleRight className={getSize(6)} />
            </Button>
          )
        }
      >
        <div className='text-lg'>{name}</div>
      </Row>

      {(contact.email !== name || contact.username !== undefined) && (
        <Row>
          <div className='flex flex-col text-sm'>
            {contact.email && contact.email !== name && <div className='text-sky-700'>{contact.email}</div>}
            {contact.username && <div className='text-sky-700'>{contact.username}</div>}
            {contact.phone && <div>{contact.phone}</div>}
          </div>
        </Row>
      )}

      {contact.address && (
        <Row>
          <AddressSection address={contact.address} />
        </Row>
      )}
    </div>
  );
};
