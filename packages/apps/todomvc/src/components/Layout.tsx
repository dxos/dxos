//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { useEmbed, useSpace } from '@dxos/react-client';

export const Layout = () => {
  const { dispatch } = useEmbed();
  const space = useSpace();

  return (
    <>
      <button id='open' onClick={() => dispatch({ type: 'set-layout', layout: 'left' })} data-testid='open-button'>
        ❯
      </button>
      <section className='todoapp'>{space && <Outlet context={{ space }} />}</section>
    </>
  );
};
