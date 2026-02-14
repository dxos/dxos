//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';
import { IconButton } from '../Button';
import { Toolbar } from '../Toolbar';

import { Main, useSidebars } from './Main';

type StoryMainArgs = {};

const NavigationSidebarToggle = ({ close }: { close?: boolean }) => {
  const { toggleNavigationSidebar } = useSidebars('StoryMain__SidebarToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-left--regular' : 'ph--caret-right--regular'}
      iconOnly
      label='Toggle navigation sidebar'
      onClick={toggleNavigationSidebar}
    />
  );
};

const ComplementarySidebarToggle = ({ close }: { close?: boolean }) => {
  const { toggleComplementarySidebar } = useSidebars('StoryMain__SidebarToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-right--regular' : 'ph--caret-left--regular'}
      iconOnly
      label='Toggle complementary sidebar'
      onClick={toggleComplementarySidebar}
    />
  );
};

const DefaultStory = (_args: StoryMainArgs) => {
  return (
    <Main.Root defaultComplementarySidebarState='closed' defaultNavigationSidebarState='closed'>
      <Main.Overlay />
      <Main.NavigationSidebar label='Navigation'>
        <Toolbar.Root>
          <h1>Navigation</h1>
          <Toolbar.Separator variant='gap' classNames='grow' />
          <NavigationSidebarToggle close />
        </Toolbar.Root>
      </Main.NavigationSidebar>
      <Main.Content classNames='is-full'>
        <Toolbar.Root>
          <NavigationSidebarToggle />
          <div className='flex items-center grow justify-center'>Main</div>
          <ComplementarySidebarToggle />
        </Toolbar.Root>
      </Main.Content>
      <Main.ComplementarySidebar label='Complementary'>
        <Toolbar.Root>
          <ComplementarySidebarToggle close />
          <Toolbar.Separator variant='gap' classNames='grow' />
          <h1>Complementary</h1>
        </Toolbar.Root>
      </Main.ComplementarySidebar>
    </Main.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Main',
  component: Main.Root,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
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
