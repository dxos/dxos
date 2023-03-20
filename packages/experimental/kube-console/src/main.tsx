//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { HomeRoute } from './routes';

import '@dxosTheme';

import '@dxos/client/shell.css';
import '../style.css';
import 'virtual:fonts.css';

const Fullscreen: FC<{ children: ReactNode }> = ({ children }) => {
  return <div className='flex flex-col overflow-hidden absolute left-0 right-0 top-0 bottom-0'>{children}</div>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <Fullscreen>
    <HomeRoute />
  </Fullscreen>
);
