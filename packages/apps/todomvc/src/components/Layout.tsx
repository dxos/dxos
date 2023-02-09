//
// Copyright 2022 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { IFrameClientServicesProxy, ShellLayout } from '@dxos/client';
import { useClient, useCurrentSpace } from '@dxos/react-client';

export const Layout = ({ children }: PropsWithChildren<{}>) => {
  const client = useClient();
  const [space] = useCurrentSpace();

  const handleOpen = () => {
    if (client.services instanceof IFrameClientServicesProxy) {
      void client.services.setLayout(ShellLayout.CURRENT_SPACE, { spaceKey: space?.key });
    }
  };

  return (
    <>
      {/* TODO(wittjosiah): Make DXOS button. */}
      <button id='open' onClick={handleOpen} data-testid='open-button'>
        ❯
      </button>
      {/* TODO(wittjosiah): Remove this condition once useQuery supports undefined spaces. */}
      <section className='todoapp'>{children}</section>
      <footer className='info'>
        <p>Double-click to edit a todo</p>
        <p>
          Created by <a href='https://github.com/dxos/'>DXOS</a>
        </p>
        <p>
          Based on <a href='https://todomvc.com'>TodoMVC</a>
        </p>
      </footer>
    </>
  );
};
