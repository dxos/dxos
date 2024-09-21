//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { withClientProvider } from './withClientProvider';
import { useClient } from '../client';

const Test = () => {
  const client = useClient();
  if (!client) {
    return null;
  }

  const identity = client.halo.identity.get();
  if (!identity) {
    return null;
  }

  return (
    <table className='table [&>td:align-top]'>
      <tbody>
        <tr>
          <td>identity</td>
          <td>{JSON.stringify(identity.profile)}</td>
        </tr>
        <tr>
          <td>client</td>
          <td>{JSON.stringify(client.toJSON(), null, 2)}</td>
        </tr>
      </tbody>
    </table>
  );
};

export default {
  title: 'react-client/withClient',
  component: Test,
  decorators: [withTheme, withClientProvider({ createIdentity: true })],
};

export const Default = {};
