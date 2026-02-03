//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';
import { IconButton } from '../Button';
import { Input } from '../Input';
import { Toolbar } from '../Toolbar';

import { Main, useDynamicDrawer, useSidebars } from './Main';

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

const DrawerToggle = ({ close }: { close?: boolean }) => {
  const { toggleDrawer } = useSidebars('StoryMain__DrawerToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-down--regular' : 'ph--caret-up--regular'}
      iconOnly
      label='Toggle drawer'
      onClick={toggleDrawer}
    />
  );
};

const DrawerState = () => {
  const { drawerState } = useSidebars('StoryMain__DrawerStateDisplay');
  return (
    <div className='flex items-center gap-2'>
      <span>Drawer</span>
      <span>({drawerState})</span>
      <span>[{window.innerHeight}]</span>
    </div>
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
  title: 'ui/react-ui-core/Main',
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

const DrawerStory = (_args: StoryMainArgs) => {
  return (
    <Main.Root>
      <Main.Overlay />
      <DrawerStoryInner />
    </Main.Root>
  );
};

const DrawerStoryInner = () => {
  useDynamicDrawer('DrawerStoryInner');

  return (
    <>
      <Main.Content classNames='flex flex-col is-full overflow-hidden'>
        <Toolbar.Root classNames='pli-2'>
          <h1>Main Content</h1>
          <Toolbar.Separator variant='gap' classNames='grow' />
          <DrawerToggle />
        </Toolbar.Root>
        <div className='flex flex-col bs-full overflow-y-auto p-2'>
          <p className='text-sm text-description'>
            The drawer is mutually exclusive with sidebars and is intended for mobile apps.
          </p>
          <div className='plb-2 space-y-2'>
            {Array.from({ length: 50 }).map((_, i) => (
              <p key={i}>Line {i + 1}</p>
            ))}
          </div>
        </div>
      </Main.Content>
      <Main.Drawer label='Drawer' classNames='grid grid-rows-[min-content_1fr_min-content]'>
        <Toolbar.Root classNames='pli-2'>
          <DrawerState />
          <Toolbar.Separator variant='gap' classNames='grow' />
          <DrawerToggle close />
        </Toolbar.Root>
        <div className='p-2 overflow-y-auto'>
          <p className='text-sm text-description'>
            On mobile devices, the drawer automatically switches to fullscreenwhen the keyboard appears.
          </p>
          <div className='plb-2 space-y-2'>
            {Array.from({ length: 50 }).map((_, i) => (
              <p key={i}>Line {i + 1}</p>
            ))}
          </div>
        </div>
        <div className='p-2 border-bs border-separator'>
          <Input.Root>
            <Input.TextInput autoFocus placeholder='Search' />
          </Input.Root>
        </div>
      </Main.Drawer>
    </>
  );
};

export const WithDrawer: Story = {
  render: DrawerStory,
  args: {},
};
