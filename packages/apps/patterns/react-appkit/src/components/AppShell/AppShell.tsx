//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';
import type { RouteProps } from 'react-router-dom';
import { HashRouter, useRoutes } from 'react-router-dom';

import { Client, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider, useConfig } from '@dxos/react-client';
import { UiKitProvider } from '@dxos/react-uikit';

import translationResources from '../../translations';
import { AppLayout, AppLayoutProps } from '../AppLayout';
import { RequireIdentity } from '../RequireIdentity';
import { SpacesView } from '../SpacesView';

const configProvider = async () => new Config(await Dynamics(), Defaults());

const clientProvider = async () => {
  const config = await configProvider();
  const client = new Client({ config, services: fromIFrame(config) });
  await client.initialize();
  return client;
};

type RoutesProps = {
  spaceElement: RouteProps['element'];
  onSpaceCreate: AppLayoutProps['onSpaceCreate'];
};

const Routes = ({ spaceElement, onSpaceCreate }: RoutesProps) => {
  const config = useConfig();
  // TODO(wittjosiah): Separate config for HALO UI or assume path so it doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from teh config.
  const remoteSource =
    config.get('runtime.client.remoteSource')?.split('/').slice(0, -1).join('/') ?? 'https://halo.dxos.org';

  return useRoutes([
    {
      path: '/',
      element: <RequireIdentity redirect={remoteSource} />,
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
      <ClientProvider client={clientProvider}>
        <HashRouter>
          <Routes {...props} />
        </HashRouter>
        {globalContent}
      </ClientProvider>
    </UiKitProvider>
  );
};
