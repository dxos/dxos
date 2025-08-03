//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { type PropsWithChildren } from 'react';

import { faker } from '@dxos/random';
import { activeSurface, surfaceShadow } from '@dxos/react-ui-theme';

import { withTheme } from '../../testing';

import { ScrollArea } from './ScrollArea';

faker.seed(1234);

const DefaultStory = ({ children }: PropsWithChildren<{}>) => {
  return (
    <ScrollArea.Root
      classNames={['is-[300px] bs-[400px] rounded', activeSurface, surfaceShadow({ elevation: 'positioned' })]}
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
  title: 'ui/react-ui-core/Scroll area',
  component: ScrollArea,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    children: faker.lorem.paragraphs(5),
  },
};
