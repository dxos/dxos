//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Buttons';
import { Main, useSidebar } from './Main';

type StoryMainArgs = {};

const SidebarToggle = () => {
  const { toggleSidebar } = useSidebar('StoryMain__SidebarToggle');
  return <Button onClick={toggleSidebar}>Toggle sidebar</Button>;
};

const StoryMain = (_args: StoryMainArgs) => {
  return (
    <Main.Root defaultSidebarOpen>
      <Main.Overlay />
      <Main.Sidebar swipeToDismiss>
        <p>Sidebar content, hi!</p>
        <SidebarToggle />
      </Main.Sidebar>
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
