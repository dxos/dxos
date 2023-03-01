//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { Intersect, Laptop, PlusCircle } from 'phosphor-react';
import React, { useState } from 'react';

import { PublicKey, ShellLayout } from '@dxos/client';
import { useClient, useSpace, useSpaces } from '@dxos/react-client';
import { ClientDecorator } from '@dxos/react-client/testing';
import { Button, ButtonGroup, getSize, Group, Tooltip } from '@dxos/react-components';

import { SpaceListItem } from '../../components';
import { ShellProvider, useShell } from './ShellContext';

export default {
  component: ShellProvider
};

const ShellControls = () => {
  const client = useClient();
  const spaces = useSpaces();
  const shell = useShell();

  const controls = (
    <ButtonGroup className='mbe-4'>
      <Tooltip content='Devices'>
        <Button onClick={() => shell.setLayout(ShellLayout.DEVICE_INVITATIONS)}>
          <Laptop weight='fill' className={getSize(6)} />
        </Button>
      </Tooltip>
      <Tooltip content='Create Space'>
        <Button onClick={() => client.echo.createSpace({ name: faker.animal.bird() })}>
          <PlusCircle weight='fill' className={getSize(6)} />
        </Button>
      </Tooltip>
      <Tooltip content='Join Space'>
        <Button onClick={() => shell.setLayout(ShellLayout.JOIN_SPACE)}>
          <Intersect weight='fill' className={getSize(6)} />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );

  const header = <div className='flex flex-row-reverse'>{controls}</div>;

  return (
    <Group label={{ children: header }} className='flex flex-col w-96'>
      <ul>
        {spaces.map((space) => (
          <SpaceListItem
            key={space.key.toHex()}
            space={space}
            onClick={() => shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key })}
          />
        ))}
      </ul>
    </Group>
  );
};

export const Default = {
  render: () => {
    const [spaceKey, setSpaceKey] = useState<PublicKey>();
    const space = useSpace(spaceKey);

    return (
      <ShellProvider space={space} onJoinedSpace={setSpaceKey}>
        <ShellControls />
      </ShellProvider>
    );
  },
  decorators: [ClientDecorator()]
};
