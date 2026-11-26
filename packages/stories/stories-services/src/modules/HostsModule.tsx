//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Summarizer } from '../contracts/index.ts';
import * as HostController from '../hosts/HostController.ts';
import { type HostControl } from '../services/index.ts';
import { PLUGIN_URLS, bindingLabel, useServices, useSnapshot } from './ServicesContext.tsx';

const EDGE_HOST = 'edge';
const FRAME_HOST = 'frame';

const pluginName = (url: string): string => Object.entries(PLUGIN_URLS).find(([, value]) => value === url)?.[0] ?? url;

type HostCardProps = {
  host: HostControl.Description;
  probe?: HostControl.Probe;
  onInstall: (hostId: string) => void;
  onUninstall: (hostId: string) => void;
  onProbe?: (hostId: string) => void;
};

const HostCard = ({ host, probe, onInstall, onUninstall, onProbe }: HostCardProps) => {
  const installed = host.plugins.includes(PLUGIN_URLS.summarizer);
  return (
    <div className='border border-separator rounded p-2 space-y-1 text-sm' data-testid={`host-${host.id}`}>
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{host.id}</span>
        <span className='text-description'>{host.kind}</span>
        <span className='grow' />
        {installed ? (
          <Button.Root
            label='Uninstall summarizer'
            onClick={() => onUninstall(host.id)}
            data-testid={`uninstall-${host.id}`}
          />
        ) : (
          <Button.Root
            label='Install summarizer'
            onClick={() => onInstall(host.id)}
            data-testid={`install-${host.id}`}
          />
        )}
        {onProbe && <Button.Root label='Probe' onClick={() => onProbe(host.id)} data-testid={`probe-${host.id}`} />}
      </div>
      <div>
        <span className='text-description'>features</span> {host.features.join(', ') || 'none'}
      </div>
      <div>
        <span className='text-description'>plugins</span> {host.plugins.map(pluginName).join(', ') || 'none'}
      </div>
      {host.services.map((service) => (
        <div key={service.key}>
          <span className='text-description'>provides</span> {service.key.split('.').pop()}{' '}
          {service.active ? 'active' : `inactive, needs ${service.unmet.join(', ')}`}
        </div>
      ))}
      {probe && (
        <div data-testid={`probe-result-${host.id}`}>
          <span className='text-description'>probe</span> localStorage: {probe.localStorage}; indexedDB:{' '}
          {probe.indexedDb}; network: {probe.network}; app notes: {probe.ungranted}
        </div>
      )}
    </div>
  );
};

/** Story module: every host, what is installed in it, and where each contract is bound. */
export const HostsModule = () => {
  const { controller } = useServices();
  const snapshot = useSnapshot();
  const [probes, setProbes] = useState<Record<string, HostControl.Probe>>({});
  const [error, setError] = useState<string>();
  const hasEdge = snapshot.peers.some((peer) => peer.id === EDGE_HOST);
  const hasFrame = snapshot.peers.some((peer) => peer.id === FRAME_HOST);
  const appGateway = snapshot.self.features.includes(Summarizer.GATEWAY_FEATURE);

  const run = useCallback((action: () => Promise<unknown>) => {
    setError(undefined);
    void action().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const handleInstall = useCallback(
    (hostId: string) => run(() => controller.install(hostId, PLUGIN_URLS.summarizer)),
    [controller, run],
  );
  const handleUninstall = useCallback(
    (hostId: string) => run(() => controller.uninstall(hostId, PLUGIN_URLS.summarizer)),
    [controller, run],
  );
  const handleProbe = useCallback(
    (hostId: string) =>
      run(async () => {
        const probe = await controller.probe(hostId);
        setProbes((current) => ({ ...current, [hostId]: probe }));
      }),
    [controller, run],
  );

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Hosts</Toolbar.Text>
          <Button.Root
            label={hasEdge ? 'Stop EDGE (mock)' : 'Start EDGE (mock)'}
            onClick={() =>
              run(() =>
                hasEdge
                  ? controller.stop(EDGE_HOST)
                  : controller.startWorker(EDGE_HOST, 'edge', [Summarizer.GATEWAY_FEATURE]),
              )
            }
            data-testid='toggle-edge'
          />
          <Button.Root
            label={hasFrame ? 'Stop frame' : 'Start frame'}
            onClick={() =>
              run(() =>
                hasFrame
                  ? controller.stop(FRAME_HOST)
                  : controller.startFrame(FRAME_HOST, [Summarizer.GATEWAY_FEATURE], []),
              )
            }
            data-testid='toggle-frame'
          />
          <Button.Root
            label={appGateway ? 'Remove app gateway' : 'Give app a gateway'}
            onClick={() => run(() => controller.setAppGateway(!appGateway))}
            data-testid='toggle-app-gateway'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-2 overflow-y-auto'>
        {error && (
          <p className='text-sm text-error-text' data-testid='hosts-error'>
            {error}
          </p>
        )}
        <HostCard host={snapshot.self} onInstall={handleInstall} onUninstall={handleUninstall} />
        {snapshot.peers.map((peer) => (
          <HostCard
            key={peer.id}
            host={peer}
            probe={probes[peer.id]}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
            onProbe={handleProbe}
          />
        ))}
        <div className='text-sm space-y-1' data-testid='bindings'>
          <div className='font-medium'>Bindings in {HostController.APP_HOST}</div>
          {Object.entries(snapshot.bindings).map(([key, binding]) => (
            <div key={key}>
              {key.split('.').pop()}: {bindingLabel(binding)}
            </div>
          ))}
        </div>
        <div className='text-sm space-y-1' data-testid='calls'>
          <div className='font-medium'>Calls</div>
          {snapshot.calls.slice(0, 12).map((call, index) => (
            <div key={`${call.at}-${index}`} className='text-description'>
              {call.key.split('.').pop()}.{call.member} via {call.binding.kind} → {call.binding.hostId}
            </div>
          ))}
        </div>
      </Panel.Body>
    </Panel.Root>
  );
};
