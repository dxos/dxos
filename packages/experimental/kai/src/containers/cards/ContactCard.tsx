//
// Copyright 2023 DXOS.org

import { Buildings, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { useSpace } from '../../hooks';
import { Contact, Organization } from '../../proto';

// TODO(burdon): Custom views:
//  - https://jquense.github.io/react-big-calendar/examples/index.html?path=/docs/examples--example-8
//  - https://github.com/jquense/react-big-calendar/blob/master/stories/demos/exampleCode/rendering.js
//  - https://jquense.github.io/react-big-calendar/examples/index.html?path=/docs/guides-creating-custom-views--page

// TODO(burdon): List events, orgs.
export const ContactCard: FC<{ contact: Contact }> = ({ contact }) => {
  const { space } = useSpace();
  const organizations = useQuery(space, Organization.filter()).filter((organization) =>
    organization.people.find((member) => member[id] === contact[id])
  );

  return (
    <div className='flex flex-col overflow-hidden p-2 border'>
      <table>
        <tbody>
          <tr>
            <td className='align-top' style={{ width: 160 }}>
              <div className='flex justify-center'>
                <User weight='thin' className={getSize(32)} />
              </div>
            </td>
            <td className='align-top'>
              <div className='text-xl pt-6 pb-4'>{contact.name}</div>
              <div className='text-sm text-blue-500'>{contact.username}</div>
              <div className='text-sm text-blue-500'>{contact.email}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div className='mt-6' />
            </td>
          </tr>
          {organizations.map((organization) => (
            <tr key={organization[id]}>
              <td className='align-top'>
                <div className='flex justify-center text-gray-500 pt-2'>
                  <Buildings weight='thin' className={getSize(20)} />
                </div>
              </td>
              <td className='align-top'>
                <div className='text-xl pb-4'>{organization.name}</div>
                <div className='text-sm text-blue-500'>{organization.website}</div>
                <div className='text-sm'>
                  {organization.address.city}, {organization.address.state}
                </div>
                <div className='text-sm pt-4 pr-6'>{organization.description}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
