//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Button } from '../Buttons';

import { Main, useSidebars } from './Main';

type StoryMainArgs = {};

const NavigationSidebarToggle = () => {
  const { toggleNavigationSidebar } = useSidebars('StoryMain__SidebarToggle');
  return <Button onClick={toggleNavigationSidebar}>Toggle navigation sidebar</Button>;
};

const ComplementarySidebarToggle = () => {
  const { toggleComplementarySidebar } = useSidebars('StoryMain__SidebarToggle');
  return <Button onClick={toggleComplementarySidebar}>Toggle complementary sidebar</Button>;
};

const DefaultStory = (_args: StoryMainArgs) => {
  return (
    <Main.Root>
      <Main.Overlay />
      <Main.NavigationSidebar label='Navigation' classNames='p-4'>
        <p>Navigation sidebar content, hi!</p>
        <NavigationSidebarToggle />
      </Main.NavigationSidebar>
      <Main.Content>
        <div role='group' className='m-2 p-4 bg-neutral-50 dark:bg-neutral-950 rounded space-y-2'>
          <ComplementarySidebarToggle />
          <p>Main content, hello!</p>
          <NavigationSidebarToggle />
        </div>
      </Main.Content>
      <Main.ComplementarySidebar label='Complementary content' classNames='p-4'>
        <p>Complementary sidebar content, hello!</p>
        <ComplementarySidebarToggle />
      </Main.ComplementarySidebar>
    </Main.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/Main',
  component: Main.Root,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
