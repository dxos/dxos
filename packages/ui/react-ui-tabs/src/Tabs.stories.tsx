//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Tabs, TabsRootProps } from './Tabs';
import { mx } from '@dxos/ui-theme';

faker.seed(1234);

const DefaultStory = ({ orientation }: TabsRootProps) => {
  return (
    <Tabs.Root orientation={orientation} defaultValue={Object.keys(content)[3]} defaultActivePart='list'>
      <Tabs.Viewport
        classNames={mx(
          'w-full overflow-hidden grid',
          orientation === 'vertical' && 'grid-cols-[minmax(min-content,1fr)_3fr]',
        )}
      >
        <Tabs.Tablist>
          {Object.entries(content).map(([id, { title }]) => (
            <Tabs.Tab key={id} value={id}>
              {title}
            </Tabs.Tab>
          ))}
        </Tabs.Tablist>
        <div className='dx-container'>
          {Object.entries(content).map(([id, { panel }]) => (
            <Tabs.Tabpanel key={id} value={id}>
              <p className='px-1'>{panel}</p>
            </Tabs.Tabpanel>
          ))}
        </div>
      </Tabs.Viewport>
    </Tabs.Root>
  );
};

const content = [...Array(24)].reduce((acc: { [key: string]: { title: string; panel: string } }, _, index) => {
  acc[`t${index}`] = {
    title: faker.commerce.productName(),
    panel: faker.lorem.paragraphs(5),
  };
  return acc;
}, {});

const meta = {
  title: 'ui/react-ui-tabs/Tabs',
  component: Tabs.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): Scrolling.
export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};
