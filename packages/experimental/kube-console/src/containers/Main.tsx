//
// Copyright 2023 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { HomeRoute } from '../routes';

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return <div className='flex flex-col overflow-hidden absolute left-0 right-0 top-0 bottom-0'>{children}</div>;
};

export const Main = () => {
  return (
    <Layout>
      <HomeRoute />
    </Layout>
  );
};
