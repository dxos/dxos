//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import type * as UiListbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Settings, Summarizer } from '../contracts/index.ts';
import * as HostController from '../hosts/HostController.ts';
import { type HostControl } from '../services/index.ts';
import { PLUGIN_URLS, useServices, useSnapshot } from './ServicesContext.tsx';

const FRAME_HOST = 'frame';
const EDGE_HOST = 'edge';

const CONNECTED_ICON = 'ph--plugs-connected--regular';
const DISCONNECTED_ICON = 'ph--plugs--regular';

/** The story's provider plugins, the contract each one provides and the host feature it needs. */
const PLUGINS = [
  { name: 'settings', url: PLUGIN_URLS.settings, contract: Settings.Contract.key, needs: Settings.STORAGE_FEATURE },
  {
    name: 'summarizer',
    url: PLUGIN_URLS.summarizer,
    contract: Summarizer.Contract.key,
    needs: Summarizer.GATEWAY_FEATURE,
  },
] as const;

/** The checks of a probe, in the order the module lists them. */
const CHECKS: readonly { readonly field: keyof HostControl.Probe; readonly label: string }[] = [
  { field: 'localStorage', label: "App's local storage" },
  { field: 'indexedDb', label: "App's IndexedDB" },
  { field: 'fetch', label: "App's server, by fetch" },
  { field: 'image', label: "App's server, by image" },
  { field: 'ungranted', label: "App's settings service" },
];

const OUTCOME_LABELS: Record<HostControl.Check['outcome'], string> = {
  blocked: 'blocked',
  reachable: 'reachable',
  skipped: 'not tried',
};

const OUTCOME_ICONS: Record<HostControl.Check['outcome'], string> = {
  blocked: 'ph--lock--regular',
  reachable: 'ph--lock-open--regular',
  skipped: 'ph--minus--regular',
};

/** How many of a probe's checks were blocked, which for an isolated host should be all it tried. */
const probeSummary = (probe: HostControl.Probe): string => {
  const outcomes = CHECKS.map((check) => probe[check.field].outcome);
  const count = (outcome: HostControl.Check['outcome']) => outcomes.filter((each) => each === outcome).length;
  return `${count('blocked')} blocked, ${count('reachable')} reachable`;
};

/** A row for each check of a probe: its verdict, and why. */
const probeOptions = (probe: HostControl.Probe): UiListbox.Option[] =>
  CHECKS.map((check) => {
    const result = probe[check.field];
    return {
      value: check.field,
      label: `${check.label}: ${OUTCOME_LABELS[result.outcome]}`,
      icon: OUTCOME_ICONS[result.outcome],
      description: result.detail,
    };
  });

/** Whether the host runs what a plugin provides, which is what its row's icon shows. */
const isActive = (host: HostControl.Description, plugin: (typeof PLUGINS)[number]): boolean =>
  host.services.some((service) => service.key === plugin.contract && service.active);

/** Whether a plugin is installed in a host, and whether the host can run what it provides. */
const pluginStatus = (host: HostControl.Description, plugin: (typeof PLUGINS)[number]): string => {
  if (!host.plugins.includes(plugin.url)) {
    return 'not installed';
  }
  const service = host.services.find((candidate) => candidate.key === plugin.contract);
  if (!service) {
    return 'installed';
  }
  return service.active ? 'active' : `inactive, this host has no ${service.unmet.join(', ')}`;
};

/** A row for each plugin: whether this host runs it, and the feature it needs. */
const pluginOptions = (host: HostControl.Description): UiListbox.Option[] =>
  PLUGINS.map((plugin) => ({
    value: plugin.name,
    label: `${plugin.name}: ${pluginStatus(host, plugin)}`,
    icon: isActive(host, plugin) ? CONNECTED_ICON : DISCONNECTED_ICON,
    description: `deps: ${plugin.needs}`,
  }));

export type HostModuleProps = {
  /** The host this module shows; the app host is the one the story's consumers run in. */
  id: string;
  title: string;
  /** Where the host runs, in a few words. */
  where: string;
  /** Starts the host; absent for the app host, which is always there. */
  start?: (controller: HostController.HostController) => Promise<void>;
};

/**
 * Story module: one host, the plugins installed in it and whether it can run each. The story shows
 * it three times, configured as the app, the sandboxed frame and the mock EDGE host.
 */
export const HostModule = ({ id, title, where, start }: HostModuleProps) => {
  const { controller } = useServices();
  const snapshot = useSnapshot();
  const [probe, setProbe] = useState<HostControl.Probe>();
  const [error, setError] = useState<string>();
  // The app host is the one this module runs in: it has no port to probe across.
  const isApp = id === HostController.APP_HOST;
  const host = isApp ? snapshot.self : snapshot.peers.find((peer) => peer.id === id);

  const run = useCallback((action: () => Promise<unknown>) => {
    setError(undefined);
    void action().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const handleToggle = useCallback(() => {
    if (start) {
      setProbe(undefined);
      run(() => (host ? controller.stop(id) : start(controller)));
    }
  }, [controller, host, id, run, start]);

  const handleProbe = useCallback(() => run(async () => setProbe(await controller.probe(id))), [controller, id, run]);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{title}</Toolbar.Text>
          {host && !isApp && <Button.Root label='Probe' onClick={handleProbe} data-testid={`probe-${id}`} />}
          {start && <Button.Root label={host ? 'Stop' : 'Start'} onClick={handleToggle} data-testid={`toggle-${id}`} />}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-2 space-y-2'>
            {error && (
              <p className='text-sm text-error-text' data-testid={`host-error-${id}`}>
                {error}
              </p>
            )}
            {host && (
              <Listbox.Root items={pluginOptions(host)}>
                <Listbox.Content aria-label='Plugins'>
                  {PLUGINS.map((plugin) => (
                    <Listbox.Item key={plugin.name} id={plugin.name} data-testid={`plugin-${plugin.name}-${id}`}>
                      <Listbox.ItemIcon />
                      <Listbox.ItemText />
                      <Listbox.ItemDescription />
                      {host.plugins.includes(plugin.url) ? (
                        <Button.Root
                          label='Uninstall'
                          onClick={() => run(() => controller.uninstall(id, plugin.url))}
                          data-testid={`uninstall-${plugin.name}-${id}`}
                        />
                      ) : (
                        <Button.Root
                          label='Install'
                          onClick={() => run(() => controller.install(id, plugin.url))}
                          data-testid={`install-${plugin.name}-${id}`}
                        />
                      )}
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.Root>
            )}
            {host && probe && (
              <Listbox.Root items={probeOptions(probe)} data-testid={`probe-result-${id}`}>
                <Listbox.Content>
                  <Listbox.ItemGroup>
                    <Listbox.ItemGroupLabel>Probe: {probeSummary(probe)}</Listbox.ItemGroupLabel>
                    {CHECKS.map((check) => (
                      <Listbox.Item key={check.field} id={check.field} data-testid={`probe-${check.field}-${id}`} />
                    ))}
                  </Listbox.ItemGroup>
                </Listbox.Content>
              </Listbox.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer classNames='p-2 text-sm'>
        <p className='text-fg-muted' data-testid={`host-${id}`} data-state={host ? 'started' : 'stopped'}>
          {where}. {host ? `Features: ${host.features.join(', ') || 'none'}` : 'Not started'}
        </p>
      </Panel.Footer>
    </Panel.Root>
  );
};

/** The host module configured as the app host, where the story's consumers run. */
export const AppHostModule = () => <HostModule id={HostController.APP_HOST} title='Host: app' where='This device' />;

/** The host module configured as the sandboxed frame host, for untrusted plugins. */
export const FrameHostModule = () => (
  <HostModule
    id={FRAME_HOST}
    title='Host: frame'
    where='This device, in a sandboxed iframe'
    start={(controller) => controller.startFrame(FRAME_HOST, [Settings.STORAGE_FEATURE], [])}
  />
);

/** The host module configured as the mock EDGE host: a Web Worker the app reaches only over a port. */
export const EdgeHostModule = () => (
  <HostModule
    id={EDGE_HOST}
    title='Host: edge (mock)'
    where='Remote, stood in for by a Web Worker'
    start={(controller) => controller.startWorker(EDGE_HOST, 'edge', [Summarizer.GATEWAY_FEATURE])}
  />
);
