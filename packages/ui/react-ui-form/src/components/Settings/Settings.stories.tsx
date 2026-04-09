//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { Button, Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Settings } from './Settings';

faker.seed(132);

const DefaultStory = () => {
  return (
    <Settings.Viewport>
      <Settings.Section title='Settings' description={faker.lorem.paragraphs(1)}>
        <Settings.Item title={faker.lorem.sentence(2)} description={faker.lorem.paragraphs(1)}>
          <Input.TextInput placeholder='Input' />
        </Settings.Item>
        <Settings.Item title={faker.lorem.sentence(2)} description={faker.lorem.paragraphs(2)}>
          <Input.Switch />
        </Settings.Item>
        <Settings.Item title={faker.lorem.sentence(3)} description={faker.lorem.paragraphs(2)}>
          <Button>Test</Button>
        </Settings.Item>
      </Settings.Section>
      <Settings.Section title='Panel Example'>
        <Settings.Panel>
          <h3 className='text-lg mb-2'>Members</h3>
          <p className='text-description'>Content inside a panel.</p>
        </Settings.Panel>
      </Settings.Section>
    </Settings.Viewport>
  );
};

const meta = {
  title: 'ui/react-ui-form/Settings',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
