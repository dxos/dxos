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
    <Settings.Root>
      <Settings.Section title='Settings' description={faker.lorem.paragraphs(1)}>
        <Settings.Group>
          <Settings.ItemInput title={faker.lorem.sentence(2)} description={faker.lorem.paragraphs(1)}>
            <Input.Root>
              <Input.TextInput placeholder='Input' />
            </Input.Root>
          </Settings.ItemInput>
          <Settings.ItemInput title={faker.lorem.sentence(2)} description={faker.lorem.paragraphs(2)}>
            <Input.Root>
              <Input.Switch />
            </Input.Root>
          </Settings.ItemInput>
          <Settings.ItemInput title={faker.lorem.sentence(3)} description={faker.lorem.paragraphs(2)}>
            <Button>Test</Button>
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
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
