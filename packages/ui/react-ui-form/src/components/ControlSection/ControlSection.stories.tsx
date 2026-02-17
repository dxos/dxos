//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Button, Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import {
  ControlGroup,
  ControlItemInput,
  ControlPage,
  ControlSection,
  type ControlSectionProps,
} from './ControlSection';

const DefaultStory = (props: ControlSectionProps) => {
  return (
    <ControlPage>
      <ControlSection {...props}>
        <ControlGroup>
          <ControlItemInput title='Item 1' description='Item 1 description'>
            <Input.Root>
              <Input.TextInput />
            </Input.Root>
          </ControlItemInput>
          <ControlItemInput title='Item 2' description='Item 2 description'>
            <Input.Root>
              <Input.Switch />
            </Input.Root>
          </ControlItemInput>
          <ControlItemInput title='Item 3' description='Item 3 description'>
            <Button>Test</Button>
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};

const meta = {
  title: 'ui/react-ui-form/ControlSection',
  component: ControlSection,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ControlSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Control Section',
    description: 'This is a control section',
  },
};
