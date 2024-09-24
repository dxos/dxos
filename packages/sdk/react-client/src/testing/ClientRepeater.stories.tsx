//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Input } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/storybook-utils';

import { ClientRepeater, type ClientRepeatedComponentProps } from './ClientRepeater';
import { useClient } from '../client';
import { useSpace } from '../echo';

export default {
  title: 'react-client/ClientRepeater',
  decorators: [withTheme],
};

const JsonPanel = ({ value }: { value: any }) => (
  <SyntaxHighlighter language='json'>{JSON.stringify(value, undefined, 2)}</SyntaxHighlighter>
);

const ClientStory = () => {
  const client = useClient();
  return <JsonPanel value={client.toJSON()} />;
};

const ClientSpace = ({ spaceKey }: ClientRepeatedComponentProps) => {
  const client = useClient();
  const space = useSpace(spaceKey);
  if (!space?.isOpen) {
    return null;
  }

  return (
    <div className='flex flex-col'>
      <Input.Root>
        <Input.TextInput
          placeholder='Name'
          value={space.properties.name}
          onChange={(event) => (space.properties.name = event.target.value)}
        />
      </Input.Root>
      <JsonPanel value={client.toJSON()} />
    </div>
  );
};

export const Default = {
  render: () => <ClientRepeater component={ClientStory} count={2} />,
};

export const Space = {
  render: () => <ClientRepeater component={ClientSpace} count={2} createSpace />,
};
