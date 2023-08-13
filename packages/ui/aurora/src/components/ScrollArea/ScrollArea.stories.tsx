//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { PropsWithChildren } from 'react';

import '@dxosTheme';
import { groupSurface, surfaceElevation } from '@dxos/aurora-theme';

import { ScrollArea } from './ScrollArea';

faker.seed(1234);

const StorybookScrollArea = ({ children }: PropsWithChildren<{}>) => {
  return (
    <ScrollArea.Root
      classNames={['is-[300px] bs-[400px] rounded', groupSurface, surfaceElevation({ elevation: 'group' })]}
    >
      <ScrollArea.Viewport classNames='rounded p-4'>
        <p>{children}</p>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation='horizontal'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar orientation='vertical'>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
};

export default {
  component: StorybookScrollArea,
};

export const Default = {
  args: {
    children: faker.lorem.paragraphs(5),
  },
};
