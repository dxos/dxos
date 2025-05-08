//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ControlSection, type ControlSectionProps } from './ControlSection';
import translations from '../../translations';

const meta: Meta<ControlSectionProps> = {
  title: 'ui/react-ui-form/ControlSection',
  component: ControlSection,
  decorators: [withLayout({ tooltips: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<ControlSectionProps>;

export const Default: Story = {
  args: {},
};
