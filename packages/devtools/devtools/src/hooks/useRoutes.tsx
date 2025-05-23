//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate, useRoutes as useRouterRoutes } from 'react-router-dom';

import { RootContainer } from '../containers';
import {
  ConfigPanel,
  CredentialsPanel,
  DeviceListPanel,
  DiagnosticsPanel,
  FeedsPanel,
  IdentityPanel,
  KeyringPanel,
  LoggingPanel,
  MembersPanel,
  MetadataPanel,
  NetworkPanel,
  ObjectsPanel,
  SignalPanel,
  SpaceInfoPanel,
  SpaceListPanel,
  StoragePanel,
  SwarmPanel,
  TracingPanel,
  DashboardPanel,
  EdgeDashboardPanel,
  AutomergePanel,
  WorkflowPanel,
  InvocationTracePanel,
  TestingPanel,
} from '../panels';

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
              element: <ConfigPanel />,
            },
            {
              path: '/client/storage',
              element: <StoragePanel />,
            },
            {
              path: '/client/logs',
              element: <LoggingPanel />,
            },
            {
              path: '/client/diagnostics',
              element: <DiagnosticsPanel />,
            },
            {
              path: '/client/tracing',
              element: <TracingPanel />,
            },
          ],
        },
        {
          path: '/halo',
          children: [
            {
              path: '/halo/identity',
              element: <IdentityPanel />,
            },
            {
              path: '/halo/devices',
              element: <DeviceListPanel />,
            },
            {
              path: '/halo/keyring',
              element: <KeyringPanel />,
            },
            {
              path: '/halo/credentials',
              element: <CredentialsPanel />,
            },
          ],
        },
        {
          path: '/echo',
          children: [
            {
              path: '/echo/spaces',
              element: <SpaceListPanel onSelect={handleSelectSpace} />,
            },
            {
              path: '/echo/space',
              element: <SpaceInfoPanel onSelectFeed={handleSelectFeed} onSelectPipeline={handleSelectFeed} />,
            },
            {
              path: '/echo/feeds',
              element: <FeedsPanel />,
            },
            {
              path: '/echo/objects',
              element: <ObjectsPanel />,
            },
            {
              path: '/echo/automerge',
              element: <AutomergePanel />,
            },
            {
              path: '/echo/members',
              element: <MembersPanel />,
            },
            {
              path: '/echo/metadata',
              element: <MetadataPanel />,
            },
          ],
        },
        {
          path: '/mesh',
          children: [
            {
              path: '/mesh/signal',
              element: <SignalPanel />,
            },
            {
              path: '/mesh/swarm',
              element: <SwarmPanel />,
            },
            {
              path: '/mesh/network',
              element: <NetworkPanel />,
            },
          ],
        },
        {
          path: '/agent',
          children: [
            {
              path: '/agent/dashboard',
              element: <DashboardPanel />,
            },
          ],
        },
        {
          path: '/edge',
          children: [
            {
              path: '/edge/workflows',
              element: <WorkflowPanel />,
            },
            {
              path: '/edge/dashboard',
              element: <EdgeDashboardPanel />,
            },
            {
              path: '/edge/traces',
              element: <InvocationTracePanel />,
            },
            {
              path: '/edge/testing',
              element: <TestingPanel />,
            },
          ],
        },
      ],
    },
  ]);
};
