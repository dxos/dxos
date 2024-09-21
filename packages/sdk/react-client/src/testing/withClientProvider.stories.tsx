//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
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
    <table className='w-full'>
      <tbody>
        <tr>
          <td>identity</td>
          <td>
            <SyntaxHighlighter language='json'>{JSON.stringify(identity.profile, null, 2)}</SyntaxHighlighter>
          </td>
        </tr>
        <tr>
          <td>client</td>
          <td>
            <SyntaxHighlighter language='json'>{JSON.stringify(client.toJSON(), null, 2)}</SyntaxHighlighter>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default {
  title: 'react-client/withClient',
  component: Test,
  decorators: [withTheme, withClientProvider({ createIdentity: { displayName: 'DXOS' } })],
};

export const Default = {};
