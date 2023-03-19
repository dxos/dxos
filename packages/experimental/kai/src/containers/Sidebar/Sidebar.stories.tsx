//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { withRouter } from 'storybook-addon-react-router-v6';

import { MetagraphClientFake } from '@dxos/metagraph';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { MetagraphProvider } from '@dxos/react-metagraph';

import '@dxosTheme';

import { AppStateProvider } from '../../hooks';
import { Sidebar } from './Sidebar';

const Test = () => {
  // TODO(burdon): Factor out providers or create decorator for Kai storybooks.
  const metagraphContext = {
    client: new MetagraphClientFake([])
  };

  return (
    <div className='flex flex-col w-full md:w-[390px] m-4 space-y-8'>
      <MetagraphProvider value={metagraphContext}>
        <AppStateProvider>
          <Sidebar onNavigate={() => {}} />
        </AppStateProvider>
      </MetagraphProvider>
    </div>
  );
};

export default {
  component: Sidebar,
  decorators: [ClientSpaceDecorator(), withRouter],
  parameters: {
    layout: 'fullscreen',
    // TODO(burdon): Factor out nav so that tests don't require params.
    // https://storybook.js.org/addons/storybook-addon-react-router-v6
    reactRouter: {
      // TODO(burdon): Space ID.
      routePath: '',
      routeParams: {}
    }
  }
};

export const Default = {
  render: () => <Test />
};
