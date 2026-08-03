//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Outline } from '@dxos/types';

import { TaskList } from './TaskList';

type StoryArgs = {
  items?: Outline.ChecklistItem[];
  activeTitle?: string;
};

const DefaultStory = ({ items = [], activeTitle }: StoryArgs) => {
  const outline = React.useMemo(
    () => Outline.make({ content: items.map(Outline.renderChecklistItem).join('\n') }),
    [items],
  );
  return <TaskList outline={outline} activeTitle={activeTitle} />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/TaskList',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { title: 'Crack the eggs', done: true },
      { title: 'Whisk with salt and pepper', done: true },
      { title: 'Heat the pan with butter', done: false },
      { title: 'Pour and stir continuously', done: false },
      { title: 'Plate and serve', done: false },
    ],
  },
};

export const WithDelegatedAgent: Story = {
  args: {
    items: [
      { title: 'Research widgets', done: false },
      { title: 'Summarize findings', done: false },
    ],
    activeTitle: 'Research widgets',
  },
};

export const Empty: Story = {};
