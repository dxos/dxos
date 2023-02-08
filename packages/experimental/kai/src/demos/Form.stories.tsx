//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { Document } from '@dxos/echo-schema';

import '@dxosTheme';

import { Input } from '../components';
import { Contact } from '../proto';

const Form: FC<{ object: Document }> = ({ object }) => {
  // console.log(object[schema]!.fields);

  // TODO(burdon): Vertical align/baseline?
  // TODO(burdon): Input/Textarea outline/border.
  const Row: FC<{ field: string; children: ReactNode }> = ({ field, children }) => (
    <div className='flex w-full mb-1'>
      <div className='flex shrink-0 flex-row-reverse pt-[7px] pr-2 w-[100px] text-sm text-gray-400'>{field}</div>
      <div className='flex w-full'>{children}</div>
    </div>
  );

  // TODO(burdon): Formatters.
  const address = [
    object.address?.street,
    [object.address?.city, [object.address?.state, object.address?.zip].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ')
  ].join('\n');

  return (
    <div className='flex w-full overflow-hidden p-2 bg-white border'>
      <div className='flex flex-col w-full'>
        <Row field='name'>
          <Input className='w-full p-1 bg-gray-100' value={object.name} />
        </Row>
        <Row field='username'>
          <Input className='w-full p-1 bg-gray-100' value={object.username} />
        </Row>
        <Row field='email'>
          <Input className='w-full p-1 bg-gray-100' value={object.email} />
        </Row>
        <Row field='address'>
          <textarea className='w-full p-1 bg-gray-100 border-0 resize-none' rows={3} value={address} />
        </Row>
      </div>
    </div>
  );
};

export default {
  component: Form
};

export const Default = () => {
  const contact = new Contact({
    name: 'Test',
    username: '@test',
    email: 'test@example.com',
    address: { street: '100 Wythe Street', city: 'Brooklyn', state: 'NY', zip: '11205' }
  });

  return (
    <div className='flex flex-col w-column'>
      <Form object={contact} />
      <div className='mb-2' />
      <Form object={new Contact()} />
    </div>
  );
};
