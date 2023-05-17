//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Button';
import { Main, MainRoot, MainOverlay, Sidebar, useSidebar } from './Main';

type StoryMainArgs = {};

const SidebarToggle = () => {
  const { toggleSidebar } = useSidebar('StoryMain__SidebarToggle');
  return <Button onClick={toggleSidebar}>Toggle sidebar</Button>;
};

const StoryMain = (_args: StoryMainArgs) => {
  return (
    <MainRoot defaultSidebarOpen>
      <MainOverlay />
      <Sidebar>
        <p>Sidebar content, hi!</p>
        <SidebarToggle />
      </Sidebar>
      <Main>
        <p>Main content, hello!</p>
        <SidebarToggle />
      </Main>
    </MainRoot>
  );
};

export default { component: StoryMain };

export const Default = {
  args: {},
};
