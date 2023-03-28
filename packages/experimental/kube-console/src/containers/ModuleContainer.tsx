//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PanelSidebarProvider } from '@dxos/react-ui';

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
    <PanelSidebarProvider
      slots={{
        content: { children: <Sidebar modules={modules} active={active.id} onActiveChange={handleActiveChange} /> },
        main: { className: 'flex overflow-hidden' }
      }}
    >
      <Component />
    </PanelSidebarProvider>
  );
};
