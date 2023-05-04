//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button } from '../Button';
import { Main, MainRoot, MainOverlay, Sidebar, useMainContext } from './Main';

type StoryMainArgs = {};

const SidebarToggle = () => {
  const { sidebarOpen, setSidebarOpen } = useMainContext('StoryMain__SidebarToggle');
  return <Button onClick={() => setSidebarOpen(!sidebarOpen)}>Toggle sidebar</Button>;
};

const StoryMain = (_args: StoryMainArgs) => {
  return (
    <MainRoot>
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
  args: {}
};
