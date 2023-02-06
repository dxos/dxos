//
// Copyright 2023 DXOS.org
//

import { StoryContext, StoryFn } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { Client, Space } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { ClientContext } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

import { SpacePanel } from './SpacePanel';

export default {
  component: SpacePanel
};

const SpaceDecorator = (Story: StoryFn, { args }: StoryContext) => {
  const testBuilder = new TestBuilder();
  const [client, setClient] = useState<Client>();
  const [space, setSpace] = useState<Space>();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const client = new Client({ services: testBuilder.createClientServicesHost() });
      await client.initialize();
      setClient(client);

      await client.halo.createProfile();
      const space = await client.echo.createSpace();
      await space?.setProperty('title', 'Q3 2022 Planning');
      setSpace(space);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (!client || !space) {
    return <Loading label='Setting things up…' />;
  }

  return (
    <ClientContext.Provider value={{ client }}>
      <Story args={{ space, ...args }} />
    </ClientContext.Provider>
  );
};

export const Default = {
  decorators: [SpaceDecorator]
};
