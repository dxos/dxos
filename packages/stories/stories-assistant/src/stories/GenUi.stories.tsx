//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { translations } from '@dxos/plugin-assistant';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { GenUiModule } from '../components/GenUiModule';
import { ModuleContainer, config, getDecorators } from '../testing';

const storybook: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/GenUi',
  render: ModuleContainer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default storybook;

type Story = StoryObj<typeof storybook>;

//
// Stories
//

export const Default: Story = {
  decorators: getDecorators({
    config: config.remote,
  }),
  args: {
    modules: [[GenUiModule]],
  },
};
