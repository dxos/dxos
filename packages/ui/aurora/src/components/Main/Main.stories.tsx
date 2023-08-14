//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Buttons';
import { Main, useSidebars } from './Main';

type StoryMainArgs = {};

const SidebarToggle = () => {
  const { toggleNavigationSidebar } = useSidebars('StoryMain__SidebarToggle');
  return <Button onClick={toggleNavigationSidebar}>Toggle sidebar</Button>;
};

const StoryMain = (_args: StoryMainArgs) => {
  return (
    <Main.Root defaultNavigationSidebarOpen>
      <Main.Overlay />
      <Main.NavigationSidebar swipeToDismiss>
        <p>Sidebar content, hi!</p>
        <SidebarToggle />
      </Main.NavigationSidebar>
      <Main.Content>
        <p>Main content, hello!</p>
        <SidebarToggle />
      </Main.Content>
    </Main.Root>
  );
};

export default { component: StoryMain };

export const Default = {
  args: {},
};
