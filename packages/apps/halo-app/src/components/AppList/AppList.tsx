//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { App, AppProps } from './App';

export interface AppListProps {
  apps: AppProps[];
}

export const AppList = ({ apps }: AppListProps) => {
  return (
    <>
      {apps.map((app) => (
        <App key={app.module.name} {...app} />
      ))}
    </>
  );
};
