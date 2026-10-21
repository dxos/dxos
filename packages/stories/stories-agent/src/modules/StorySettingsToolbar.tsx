//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { EDGE_URLS } from '@dxos/config';
import { log } from '@dxos/log';
import { type EdgeStatus, EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { useClient } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { EDGE_ENVIRONMENTS, getEdgeEnvironment, setEdgeEnvironment } from '../testing/story-settings.ts';

/** Each environment by the host it reaches (`dev.dxos.network`), which names where the client connects. */
const EDGE_ITEMS = EDGE_ENVIRONMENTS.map((value) => ({ value, label: new URL(EDGE_URLS[value]).host }));

/** The client's EDGE connection as it reports it, about once a second while connected; `undefined` until the first report. */
const useEdgeStatus = (): EdgeStatus | undefined => {
  const client = useClient();
  const [status, setStatus] = useState<EdgeStatus>();
  useEffect(() => {
    const stream = client.services.services.EdgeAgentService?.queryEdgeStatus();
    stream?.subscribe(
      ({ status }) => setStatus(status),
      (err) => err && log.catch(err),
    );
    return () => {
      void stream?.close();
    };
  }, [client]);
  return status;
};

/** Whether the client is connected to the EDGE it booted against, with the round trip when it is. */
const EdgeStatusIndicator = () => {
  const status = useEdgeStatus();
  const connected = status?.state === EdgeStatus_ConnectionState.CONNECTED;
  return (
    <span
      role='status'
      data-testid='story-edge-status'
      data-connected={connected}
      className='flex items-center gap-1 px-2 text-sm text-fg-muted'
    >
      <Icon.Icon icon={connected ? 'ph--cloud-check--regular' : 'ph--cloud-x--regular'} />
      {connected ? `Connected · ${Math.round(status.rtt)} ms` : 'Not connected'}
    </span>
  );
};

/**
 * Story chrome: which EDGE the client talks to and a reset; both take effect on reload, since the client has already
 * booted with the previous choice. Whether the profile persists is the story's `persistent` arg.
 */
export const StorySettingsToolbar = () => {
  const client = useClient();
  const persistent = client.config.values.runtime?.client?.storage?.persistent === true;

  /** A persistent profile is registered with the EDGE it booted against, so moving to another starts a new one. */
  const handleEdgeChange = useCallback(
    async (value: string) => {
      const environment = EDGE_ENVIRONMENTS.find((candidate) => candidate === value);
      if (!environment || environment === getEdgeEnvironment() || !setEdgeEnvironment(environment)) {
        return;
      }
      if (persistent) {
        await client.reset();
      }
      window.location.reload();
    },
    [client, persistent],
  );

  /** Wipes the profile and reloads, so setup seeds a fresh space. */
  const handleReset = useCallback(async () => {
    await client.reset();
    window.location.reload();
  }, [client]);

  return (
    <Toolbar.Root>
      <Select.Root
        value={[getEdgeEnvironment()]}
        onValueChange={({ value: [value] }) => void handleEdgeChange(value)}
        items={EDGE_ITEMS}
      >
        <Select.Trigger data-testid='story-edge-select' />
        <Select.Content>
          {EDGE_ITEMS.map((item) => (
            <Select.Item key={item.value} item={item} />
          ))}
        </Select.Content>
      </Select.Root>
      <EdgeStatusIndicator />
      <Toolbar.Separator variant='gap' />
      <Button.Root icon='ph--trash--regular' label='Reset' onClick={() => void handleReset()} />
    </Toolbar.Root>
  );
};
