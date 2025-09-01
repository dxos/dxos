//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { ControlPage, ControlSection } from './ControlSection';

const meta = {
  title: 'ui/react-ui-form/ControlSection',
  component: ControlSection,
  render: (args) => (
    <ControlPage classNames='w-[40rem]'>
      <ControlSection {...args} />
    </ControlPage>
  ),
  decorators: [withLayout({ fullscreen: true, classNames: 'justify-center' }), withTheme],
  parameters: {
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
