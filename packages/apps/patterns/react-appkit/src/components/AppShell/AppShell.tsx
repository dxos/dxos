//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';
import type { RouteProps } from 'react-router-dom';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider, useConfig } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';

import translationResources from '../../translations';
import { AppLayout, AppLayoutProps } from '../AppLayout';
import { RequireIdentity } from '../RequireIdentity';
import { SpacesView } from '../SpacesView';

const config = async () => new Config(await Dynamics(), Defaults());

type RoutesProps = {
  spaceElement: RouteProps['element'];
  onSpaceCreate: AppLayoutProps['onSpaceCreate'];
};

const Routes = ({ spaceElement, onSpaceCreate }: RoutesProps) => {
  const config = useConfig();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

  return useRoutes([
    {
      path: '/',
      element: <RequireIdentity redirect={remoteSource.origin} />,
      children: [
        {
          path: '/',
          element: <AppLayout onSpaceCreate={onSpaceCreate} />,
          children: [
            {
              path: '/',
              element: <SpacesView />
            },
            {
              path: '/spaces/:space',
              element: spaceElement
            }
          ]
        }
      ]
    }
  ]);
};

export type AppShellProps = {
  globalContent?: ReactNode;
} & RoutesProps;

export const AppShell = ({ globalContent, ...props }: AppShellProps) => {
  return (
    <UiKitProvider resourceExtensions={translationResources}>
      <ClientProvider client={new Client({ config })}>
        <HashRouter>
          <Routes {...props} />
        </HashRouter>
        {globalContent}
      </ClientProvider>
    </UiKitProvider>
  );
};
