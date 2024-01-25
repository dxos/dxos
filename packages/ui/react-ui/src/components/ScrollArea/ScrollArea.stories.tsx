//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type PropsWithChildren } from 'react';

import { groupSurface, surfaceElevation } from '@dxos/react-ui-theme';

import { ScrollArea } from './ScrollArea';
import { withTheme } from '../../testing';

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
  title: 'react-ui/Scroll area',
  component: StorybookScrollArea,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    children: faker.lorem.paragraphs(5),
  },
};
