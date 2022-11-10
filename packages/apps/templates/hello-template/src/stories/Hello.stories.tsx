//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import React from 'react';

import { ClientProvider, useClient, useProfile } from '@dxos/react-client';
import { Button } from '@dxos/react-uikit';

const Hello = () => {
  const client = useClient();
  const profile = useProfile();

  if (!profile) {
    return <Button onClick={() => client.halo.createProfile()}>Create Profile</Button>;
  }

  return (
    <div style={{ padding: 8 }}>
      <pre>{JSON.stringify(profile, undefined, 2)}</pre>
      <pre>{JSON.stringify(client.config, undefined, 2)}</pre>
    </div>
  );
};

const Template: ComponentStory<typeof Hello> = () => <Hello />;

export const Primary = Template.bind({});
Primary.args = {};
Primary.decorators = [
  (Story) => (
    <ClientProvider>
      <Story />
    </ClientProvider>
  )
];

export default {
  title: 'HelloWorld/Hello',
  component: Hello
} as ComponentMeta<typeof Hello>;
