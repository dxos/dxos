//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Summarizer } from '../contracts/index.ts';
import { HostCard, useHostActions } from './HostCard.tsx';
import { useServices, useSnapshot } from './ServicesContext.tsx';

const EDGE_HOST = 'edge';

/**
 * Story module: the remote host. The story stands a Web Worker in for EDGE, which the app reaches
 * only over a message port, as it would reach the real one over the network.
 */
export const RemoteRuntimeModule = () => {
  const { controller } = useServices();
  const snapshot = useSnapshot();
  const actions = useHostActions();
  const remote = snapshot.peers.filter((peer) => peer.kind === 'edge');
  const hasEdge = remote.some((peer) => peer.id === EDGE_HOST);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Remote runtime</Toolbar.Text>
          <Button.Root
            label={hasEdge ? 'Stop EDGE host (mock)' : 'Start EDGE host (mock)'}
            onClick={() =>
              actions.run(() =>
                hasEdge
                  ? controller.stop(EDGE_HOST)
                  : controller.startWorker(EDGE_HOST, 'edge', [Summarizer.GATEWAY_FEATURE]),
              )
            }
            data-testid='toggle-edge'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-2 overflow-y-auto'>
        <p className='text-sm text-fg-muted'>
          A Web Worker standing in for EDGE. It has an AI gateway, and the app reaches it only over a port. Start it,
          then install the summarizer in it.
        </p>
        {actions.error && (
          <p className='text-sm text-error-text' data-testid='remote-runtime-error'>
            {actions.error}
          </p>
        )}
        {remote.length === 0 && <p className='text-sm text-fg-muted'>Not connected.</p>}
        {remote.map((peer) => (
          <HostCard
            key={peer.id}
            host={peer}
            probe={actions.probes[peer.id]}
            onInstall={actions.install}
            onUninstall={actions.uninstall}
            onProbe={actions.probe}
          />
        ))}
      </Panel.Body>
    </Panel.Root>
  );
};
