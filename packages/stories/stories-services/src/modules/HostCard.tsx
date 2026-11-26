//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';

import { Summarizer } from '../contracts/index.ts';
import { type HostControl } from '../services/index.ts';
import { PLUGIN_URLS, useServices } from './ServicesContext.tsx';

const pluginName = (url: string): string => Object.entries(PLUGIN_URLS).find(([, value]) => value === url)?.[0] ?? url;

/** What a runtime module does to its hosts, and the last failure of any of those actions. */
export type HostActions = {
  readonly error?: string;
  readonly probes: Readonly<Record<string, HostControl.Probe>>;
  /** Runs an action and records its failure in `error`. */
  readonly run: (action: () => Promise<unknown>) => void;
  readonly install: (hostId: string) => void;
  readonly uninstall: (hostId: string) => void;
  readonly probe: (hostId: string) => void;
  /** Gives the app host an AI gateway of its own, or takes it away. */
  readonly setAppGateway: (enabled: boolean) => void;
};

/** The summarizer install, uninstall and probe actions of one runtime module. */
export const useHostActions = (): HostActions => {
  const { controller } = useServices();
  const [probes, setProbes] = useState<Record<string, HostControl.Probe>>({});
  const [error, setError] = useState<string>();

  const run = useCallback((action: () => Promise<unknown>) => {
    setError(undefined);
    void action().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const install = useCallback(
    (hostId: string) => run(() => controller.install(hostId, PLUGIN_URLS.summarizer)),
    [controller, run],
  );
  const uninstall = useCallback(
    (hostId: string) => run(() => controller.uninstall(hostId, PLUGIN_URLS.summarizer)),
    [controller, run],
  );
  const probe = useCallback(
    (hostId: string) =>
      run(async () => {
        const result = await controller.probe(hostId);
        setProbes((current) => ({ ...current, [hostId]: result }));
      }),
    [controller, run],
  );

  const setAppGateway = useCallback(
    (enabled: boolean) => run(() => controller.setAppGateway(enabled)),
    [controller, run],
  );

  return { error, probes, run, install, uninstall, probe, setAppGateway };
};

export type HostCardProps = {
  host: HostControl.Description;
  probe?: HostControl.Probe;
  onInstall: (hostId: string) => void;
  onUninstall: (hostId: string) => void;
  onProbe?: (hostId: string) => void;
  /** Set for a host whose AI gateway the story can add and remove. */
  onSetGateway?: (enabled: boolean) => void;
};

/** One host: what it has, what is installed in it, and what it provides. */
export const HostCard = ({ host, probe, onInstall, onUninstall, onProbe, onSetGateway }: HostCardProps) => {
  const installed = host.plugins.includes(PLUGIN_URLS.summarizer);
  const hasGateway = host.features.includes(Summarizer.GATEWAY_FEATURE);
  return (
    <div className='border border-separator rounded p-2 space-y-1 text-sm' data-testid={`host-${host.id}`}>
      <div className='flex items-center gap-2'>
        <span className='font-medium'>{host.id}</span>
        <span className='text-fg-muted'>{host.kind}</span>
        <span className='grow' />
        {onSetGateway && (
          <Button.Root
            label={hasGateway ? 'Remove AI gateway' : 'Add AI gateway'}
            onClick={() => onSetGateway(!hasGateway)}
            data-testid={`toggle-${host.id}-gateway`}
          />
        )}
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
        <span className='text-fg-muted'>features</span> {host.features.join(', ') || 'none'}
      </div>
      <div>
        <span className='text-fg-muted'>plugins</span> {host.plugins.map(pluginName).join(', ') || 'none'}
      </div>
      {host.services.map((service) => (
        <div key={service.key}>
          <span className='text-fg-muted'>provides</span> {service.key.split('.').pop()}{' '}
          {service.active ? 'active' : `inactive, needs ${service.unmet.join(', ')}`}
        </div>
      ))}
      {probe && (
        <div data-testid={`probe-result-${host.id}`}>
          <span className='text-fg-muted'>probe</span> localStorage: {probe.localStorage}; indexedDB: {probe.indexedDb};
          network: {probe.network}; app notes: {probe.ungranted}
        </div>
      )}
    </div>
  );
};
