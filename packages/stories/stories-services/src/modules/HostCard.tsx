//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';

import { NoteStore, Summarizer } from '../contracts/index.ts';
import { type HostControl } from '../services/index.ts';
import { PLUGIN_URLS, useServices } from './ServicesContext.tsx';

/** Where a host runs, for the kinds whose id does not already say it. */
const KIND_LABELS: Partial<Record<HostControl.Kind, string>> = {
  worker: 'Web Worker',
  frame: 'Sandboxed iframe',
  edge: 'Mock EDGE worker',
};

/** The story's provider plugins, and the contract each one provides. */
const PLUGINS = [
  { name: 'notes', url: PLUGIN_URLS.notes, contract: NoteStore.Contract.key },
  { name: 'summarizer', url: PLUGIN_URLS.summarizer, contract: Summarizer.Contract.key },
] as const;

/** What a runtime module does to its hosts, and the last failure of any of those actions. */
export type HostActions = {
  readonly error?: string;
  readonly probes: Readonly<Record<string, HostControl.Probe>>;
  /** Runs an action and records its failure in `error`. */
  readonly run: (action: () => Promise<unknown>) => void;
  readonly install: (hostId: string, pluginUrl: string) => void;
  readonly uninstall: (hostId: string, pluginUrl: string) => void;
  readonly probe: (hostId: string) => void;
};

/** The install, uninstall and probe actions of one runtime module. */
export const useHostActions = (): HostActions => {
  const { controller } = useServices();
  const [probes, setProbes] = useState<Record<string, HostControl.Probe>>({});
  const [error, setError] = useState<string>();

  const run = useCallback((action: () => Promise<unknown>) => {
    setError(undefined);
    void action().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const install = useCallback(
    (hostId: string, pluginUrl: string) => run(() => controller.install(hostId, pluginUrl)),
    [controller, run],
  );
  const uninstall = useCallback(
    (hostId: string, pluginUrl: string) => run(() => controller.uninstall(hostId, pluginUrl)),
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

  return { error, probes, run, install, uninstall, probe };
};

/** Whether a plugin is installed in a host, and whether the host can run what it provides. */
const pluginStatus = (host: HostControl.Description, plugin: (typeof PLUGINS)[number]): string => {
  if (!host.plugins.includes(plugin.url)) {
    return 'not installed';
  }
  const service = host.services.find((candidate) => candidate.key === plugin.contract);
  if (!service) {
    return 'installed';
  }
  return service.active ? 'active' : `inactive, host has no ${service.unmet.join(', ')}`;
};

export type HostCardProps = {
  host: HostControl.Description;
  probe?: HostControl.Probe;
  onInstall: (hostId: string, pluginUrl: string) => void;
  onUninstall: (hostId: string, pluginUrl: string) => void;
  onProbe?: (hostId: string) => void;
};

/** One host: where it runs, what it has, and whether it can run each plugin installed in it. */
export const HostCard = ({ host, probe, onInstall, onUninstall, onProbe }: HostCardProps) => {
  const features = `Features: ${host.features.join(', ') || 'none'}`;
  const kind = KIND_LABELS[host.kind];
  return (
    <Card.Root data-testid={`host-${host.id}`}>
      <Card.Header>
        <Card.Title>Host: {host.id}</Card.Title>
        {onProbe && <Button.Root label='Probe' onClick={() => onProbe(host.id)} data-testid={`probe-${host.id}`} />}
      </Card.Header>
      <Card.Body>
        <Card.Description>{kind ? `${kind}. ${features}` : features}</Card.Description>
      </Card.Body>
      <Card.Section title='Plugins'>
        {PLUGINS.map((plugin) => {
          const installed = host.plugins.includes(plugin.url);
          return (
            <Card.Row
              key={plugin.name}
              icon='ph--plug--regular'
              trailing={
                installed ? (
                  <Button.Root
                    label='Uninstall'
                    onClick={() => onUninstall(host.id, plugin.url)}
                    data-testid={`uninstall-${plugin.name}-${host.id}`}
                  />
                ) : (
                  <Button.Root
                    label='Install'
                    onClick={() => onInstall(host.id, plugin.url)}
                    data-testid={`install-${plugin.name}-${host.id}`}
                  />
                )
              }
              data-testid={`plugin-${plugin.name}-${host.id}`}
            >
              {plugin.name}: {pluginStatus(host, plugin)}
            </Card.Row>
          );
        })}
      </Card.Section>
      {probe && (
        <Card.Section title='Probe'>
          <Card.Text variant='muted' data-testid={`probe-result-${host.id}`}>
            localStorage: {probe.localStorage}; indexedDB: {probe.indexedDb}; network: {probe.network}; app notes:{' '}
            {probe.ungranted}
          </Card.Text>
        </Card.Section>
      )}
    </Card.Root>
  );
};
