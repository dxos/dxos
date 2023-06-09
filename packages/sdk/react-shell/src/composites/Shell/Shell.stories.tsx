//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import { Intersect, Laptop, PlusCircle } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Button, ButtonGroup } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { PublicKey, ShellLayout } from '@dxos/client';
import { Group, TooltipRoot, TooltipContent, TooltipTrigger } from '@dxos/react-appkit';
import { useClient, useSpace, useSpaces } from '@dxos/react-client';
import { ClientDecorator } from '@dxos/react-client/testing';

import { SpaceListItem } from '../../components';
import { ShellProvider, useShell } from './ShellContext';

export default {
  component: ShellProvider,
};

const ShellControls = () => {
  const client = useClient();
  const spaces = useSpaces();
  const shell = useShell();

  const controls = (
    <ButtonGroup classNames='mbe-4'>
      <TooltipRoot>
        <TooltipContent>Devices</TooltipContent>
        <TooltipTrigger asChild>
          <Button onClick={() => shell.setLayout(ShellLayout.DEVICE_INVITATIONS)}>
            <Laptop weight='fill' className={getSize(6)} />
          </Button>
        </TooltipTrigger>
      </TooltipRoot>
      <TooltipRoot>
        <TooltipContent>Create Space</TooltipContent>
        <TooltipTrigger asChild>
          <Button onClick={() => client.createSpace({ name: faker.animal.bird() })}>
            <PlusCircle weight='fill' className={getSize(6)} />
          </Button>
        </TooltipTrigger>
      </TooltipRoot>
      <TooltipRoot>
        <TooltipContent>Join Space</TooltipContent>
        <TooltipTrigger asChild>
          <Button onClick={() => shell.setLayout(ShellLayout.JOIN_SPACE)}>
            <Intersect weight='fill' className={getSize(6)} />
          </Button>
        </TooltipTrigger>
      </TooltipRoot>
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
  decorators: [ClientDecorator()],
};
