//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate, useRoutes as useRouterRoutes } from 'react-router-dom';

import { RootContainer } from '../containers/index.ts';
import {
  AutomergeArticle,
  ConfigArticle,
  CredentialsArticle,
  DeviceListArticle,
  DiagnosticsArticle,
  EdgeDashboardArticle,
  FeedsArticle,
  IdentityArticle,
  InvocationTraceArticle,
  KeyringArticle,
  LoggingArticle,
  MembersArticle,
  MetadataArticle,
  NetworkArticle,
  ObjectsArticle,
  SignalArticle,
  SpaceInfoArticle,
  SpaceListArticle,
  SqliteArticle,
  StorageArticle,
  SwarmArticle,
  TestingArticle,
  WorkflowArticle,
} from '../containers/index.ts';

export const namespace = 'devtools';

/**
 * Main app routes.
 * https://reactrouter.com/en/main
 */
export const useRoutes = () => {
  const navigate = useNavigate();
  const handleSelectSpace = useCallback(() => navigate('/echo/space'), [navigate]);
  const handleSelectFeed = useCallback(() => navigate('/echo/feeds'), [navigate]);

  return useRouterRoutes([
    {
      path: '/',
      element: <RootContainer />,
      children: [
        {
          path: '/client',
          children: [
            {
              path: '/client/config',
              element: <ConfigArticle />,
            },
            {
              path: '/client/storage',
              element: <StorageArticle />,
            },
            {
              path: '/client/sqlite',
              element: <SqliteArticle />,
            },
            {
              path: '/client/logs',
              element: <LoggingArticle />,
            },
            {
              path: '/client/diagnostics',
              element: <DiagnosticsArticle />,
            },
          ],
        },
        {
          path: '/halo',
          children: [
            {
              path: '/halo/identity',
              element: <IdentityArticle />,
            },
            {
              path: '/halo/devices',
              element: <DeviceListArticle />,
            },
            {
              path: '/halo/keyring',
              element: <KeyringArticle />,
            },
            {
              path: '/halo/credentials',
              element: <CredentialsArticle />,
            },
          ],
        },
        {
          path: '/echo',
          children: [
            {
              path: '/echo/spaces',
              element: <SpaceListArticle onSelect={handleSelectSpace} />,
            },
            {
              path: '/echo/space',
              element: <SpaceInfoArticle onSelectFeed={handleSelectFeed} onSelectPipeline={handleSelectFeed} />,
            },
            {
              path: '/echo/feeds',
              element: <FeedsArticle />,
            },
            {
              path: '/echo/objects',
              element: <ObjectsArticle />,
            },
            {
              path: '/echo/automerge',
              element: <AutomergeArticle />,
            },
            {
              path: '/echo/members',
              element: <MembersArticle />,
            },
            {
              path: '/echo/metadata',
              element: <MetadataArticle />,
            },
          ],
        },
        {
          path: '/mesh',
          children: [
            {
              path: '/mesh/signal',
              element: <SignalArticle />,
            },
            {
              path: '/mesh/swarm',
              element: <SwarmArticle />,
            },
            {
              path: '/mesh/network',
              element: <NetworkArticle />,
            },
          ],
        },
        {
          path: '/edge',
          children: [
            {
              path: '/edge/workflows',
              element: <WorkflowArticle />,
            },
            {
              path: '/edge/dashboard',
              element: <EdgeDashboardArticle />,
            },
            {
              path: '/edge/traces',
              element: <InvocationTraceArticle />,
            },
            {
              path: '/edge/testing',
              element: <TestingArticle />,
            },
          ],
        },
      ],
    },
  ]);
};
