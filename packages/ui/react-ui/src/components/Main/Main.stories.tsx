//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Main, useSidebars } from './Main';
import { withTheme } from '../../testing';
import { Button } from '../Buttons';

type StoryMainArgs = {};

const NavigationSidebarToggle = () => {
  const { toggleNavigationSidebar } = useSidebars('StoryMain__SidebarToggle');
  return <Button onClick={toggleNavigationSidebar}>Toggle navigation sidebar</Button>;
};

const ComplementarySidebarToggle = () => {
  const { toggleComplementarySidebar } = useSidebars('StoryMain__SidebarToggle');
  return <Button onClick={toggleComplementarySidebar}>Toggle complementary sidebar</Button>;
};

const StoryMain = (_args: StoryMainArgs) => {
  return (
    <Main.Root defaultComplementarySidebarOpen>
      <Main.Overlay />
      <Main.NavigationSidebar classNames='p-4'>
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
      <Main.ComplementarySidebar classNames='p-4'>
        <p>Complementary sidebar content, hello!</p>
        <ComplementarySidebarToggle />
      </Main.ComplementarySidebar>
    </Main.Root>
  );
};

export default {
  title: 'DXOS UI/Main',
  component: StoryMain,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
  layout: 'fullscreen',
};
