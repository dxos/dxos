//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme, withSignals } from '@dxos/storybook-utils';

import { Tabs } from './Tabbed';
import { ToggleContainer } from './ToggleContainer';

const content = Array.from({ length: 4 }, (_, i) => ({
  title: faker.lorem.paragraph(),
  content: faker.lorem.paragraphs(3),
}));

const meta: Meta<typeof Tabs> = {
  title: 'plugins/plugin-automation/Tabbed',
  component: Tabs,
  decorators: [withSignals, withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
};

export default meta;

type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState(0);
    return (
      <div className='flex flex-col w-[500px] p-4 bg-attention'>
        <ToggleContainer
          title={content[selected].title}
          classNames='p-1 rounded-lg bg-baseSurface border border-neutral-500'
          toggle
          defaultOpen
        >
          <div className='flex w-full overflow-hidden'>
            <Tabs length={content.length} selected={selected} onSelect={setSelected} />
            <div className='flex-1 pis-2 pie-2 overflow-y-auto'>
              <div>{content[selected].content}</div>
            </div>
          </div>
        </ToggleContainer>
      </div>
    );
  },
};
