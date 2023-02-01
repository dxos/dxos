//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Outlet } from 'react-router-dom';

import { EmbedLayout, useEmbed, useSpace } from '@dxos/react-client';

export const Layout = () => {
  const { setLayout } = useEmbed();
  const space = useSpace();

  return (
    <>
      <button id='open' onClick={() => setLayout(EmbedLayout.FULLSCREEN)} data-testid='open-button'>
        ❯
      </button>
      <section className='todoapp'>{space && <Outlet context={{ space }} />}</section>
    </>
  );
};
