//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Main } from '@dxos/react-ui';

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
    <Main.Root>
      <Main.Overlay />
      <Main.NavigationSidebar>
        <Sidebar modules={modules} active={active.id} onActiveChange={handleActiveChange} />
      </Main.NavigationSidebar>
      <Main.Content classNames='flex overflow-hidden'>
        <Component />
      </Main.Content>
    </Main.Root>
  );
};
