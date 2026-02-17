//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Button, Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Settings } from './Settings';

// TODO(burdon): Import and naming rules for consistent settings.

const DefaultStory = () => {
  return (
    <Settings.Root>
      <Settings.Section title='Settings' description='This is a settings section'>
        <Settings.Group>
          <Settings.ItemInput title='Item 1' description='Item 1 description'>
            <Input.Root>
              <Input.TextInput />
            </Input.Root>
          </Settings.ItemInput>
          <Settings.ItemInput title='Item 2' description='Item 2 description'>
            <Input.Root>
              <Input.Switch />
            </Input.Root>
          </Settings.ItemInput>
          <Settings.ItemInput title='Item 3' description='Item 3 description'>
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
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'is-full' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'is-[20rem]' })],
};
