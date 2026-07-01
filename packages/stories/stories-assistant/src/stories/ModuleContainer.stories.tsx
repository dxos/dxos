//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { translations } from '@dxos/plugin-assistant/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TestModule } from '../components';
import { ModuleContainer, config, getDecorators } from '../testing';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/ModuleContainer',
  render: ModuleContainer,
  decorators: [...getDecorators({ config: config.local }), withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Single module. */
export const Default: Story = {
  args: {
    modules: [[TestModule]],
  },
};

/** One module per column. */
export const Columns: Story = {
  args: {
    modules: [[TestModule], [TestModule], [TestModule]],
  },
};

/** Mixed grid: two stacked modules in the first column, one in the second. */
export const Grid: Story = {
  args: {
    modules: [[TestModule, TestModule], [TestModule]],
  },
};

/** `showContext` appends the ContextModule as an extra column. */
export const WithContext: Story = {
  args: {
    showContext: true,
    modules: [[TestModule]],
  },
};
