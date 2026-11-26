//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Settings, Summarizer } from '../contracts/index.ts';
import * as HostController from '../hosts/HostController.ts';
import { type HostControl } from '../services/index.ts';
import { HostCard, useHostActions } from './HostCard.tsx';
import { useServices, useSnapshot } from './ServicesContext.tsx';

const FRAME_HOST = 'frame';
const EDGE_HOST = 'edge';

/** A host the runtime's module can start and stop. */
type Startable = {
  readonly id: string;
  readonly label: string;
  readonly start: (controller: HostController.HostController) => Promise<void>;
};

export type RuntimeModuleProps = {
  /** Names the runtime in test ids. */
  id: string;
  title: string;
  hint: string;
  /** The hosts of this runtime that are up, in the order they are shown. */
  hosts: readonly HostControl.Description[];
  startable: readonly Startable[];
};

/**
 * One runtime: the hosts it has, what is installed in each, and the hosts it can start. The local
 * and the remote runtime are this one module over different hosts.
 */
export const RuntimeModule = ({ id, title, hint, hosts, startable }: RuntimeModuleProps) => {
  const { controller } = useServices();
  const actions = useHostActions();

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{title}</Toolbar.Text>
          {startable.map((host) => {
            const started = hosts.some((candidate) => candidate.id === host.id);
            return (
              <Button.Root
                key={host.id}
                label={`${started ? 'Stop' : 'Start'} ${host.label}`}
                onClick={() => actions.run(() => (started ? controller.stop(host.id) : host.start(controller)))}
                data-testid={`toggle-${host.id}`}
              />
            );
          })}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-2 overflow-y-auto'>
        <p className='text-sm text-fg-muted'>{hint}</p>
        {actions.error && (
          <p className='text-sm text-error-text' data-testid={`${id}-runtime-error`}>
            {actions.error}
          </p>
        )}
        {hosts.length === 0 && <p className='text-sm text-fg-muted'>No host started.</p>}
        {hosts.map((host) => {
          // The app host is the one this module runs in: it has no port to probe across.
          const isApp = host.id === HostController.APP_HOST;
          return (
            <HostCard
              key={host.id}
              host={host}
              probe={actions.probes[host.id]}
              onInstall={actions.install}
              onUninstall={actions.uninstall}
              onProbe={isApp ? undefined : actions.probe}
            />
          );
        })}
      </Panel.Body>
    </Panel.Root>
  );
};

const LOCAL_STARTABLE: readonly Startable[] = [
  {
    id: FRAME_HOST,
    label: 'frame host',
    start: (controller) => controller.startFrame(FRAME_HOST, [Settings.STORAGE_FEATURE], []),
  },
];

const REMOTE_STARTABLE: readonly Startable[] = [
  {
    id: EDGE_HOST,
    label: 'EDGE host (mock)',
    start: (controller) => controller.startWorker(EDGE_HOST, 'edge', [Summarizer.GATEWAY_FEATURE]),
  },
];

/** Story module: the hosts on this device, which are the app and the sandboxed frame it supervises. */
export const LocalRuntimeModule = () => {
  const snapshot = useSnapshot();
  return (
    <RuntimeModule
      id='local'
      title='Local runtime'
      hint='Hosts on this device: the app, and a sandboxed iframe for untrusted plugins. Each has local storage of its own, which settings need, and no AI gateway.'
      hosts={[snapshot.self, ...snapshot.peers.filter((peer) => peer.kind !== 'edge')]}
      startable={LOCAL_STARTABLE}
    />
  );
};

/** Story module: the remote hosts. A Web Worker stands in for EDGE, reached only over a port. */
export const RemoteRuntimeModule = () => {
  const snapshot = useSnapshot();
  return (
    <RuntimeModule
      id='remote'
      title='Remote runtime'
      hint='Hosts off this device: a Web Worker standing in for EDGE, reached only over a port. It has an AI gateway, which the summarizer needs, and no local storage.'
      hosts={snapshot.peers.filter((peer) => peer.kind === 'edge')}
      startable={REMOTE_STARTABLE}
    />
  );
};
