//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { MainRoot, Main, Sidebar as SidebarRoot, MainOverlay } from '@dxos/aurora';

import { Sidebar } from '../components';
import { useModules } from '../hooks';

export const ModuleContainer = () => {
  const navigate = useNavigate();
  const { module } = useParams();
  const modules = useModules();
  const active = modules.find(({ id }) => id === module);
  if (!active) {
    return null; // TODO(burdon): Redirect.
  }

  const handleActiveChange = (module: string) => {
    navigate(`/module/${module}`);
  };

  const { Component } = active;

  return (
    <MainRoot>
      <MainOverlay />
      <SidebarRoot>
        <Sidebar modules={modules} active={active.id} onActiveChange={handleActiveChange} />
      </SidebarRoot>
      <Main className='flex overflow-hidden'>
        <Component />
      </Main>
    </MainRoot>
  );
};
