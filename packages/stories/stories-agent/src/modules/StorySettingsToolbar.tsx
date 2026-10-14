//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { type EdgeStatus, EdgeStatus_ConnectionState } from '@dxos/protocols/buf/dxos/client/services_pb';
import { useClient } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import {
  EDGE_ENVIRONMENTS,
  type EdgeEnvironment,
  getEdgeEnvironment,
  isPersistent,
  setEdgeEnvironment,
  setPersistent,
} from '../testing/story-settings.ts';

const EDGE_LABELS: Record<EdgeEnvironment, string> = {
  local: 'Local EDGE',
  dev: 'Dev',
  preview: 'Preview',
  production: 'Production',
};

const EDGE_ITEMS = EDGE_ENVIRONMENTS.map((value) => ({ value, label: EDGE_LABELS[value] }));

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
 * Story chrome: which EDGE the client talks to, whether its profile persists, and a reset. Each takes effect on
 * reload, since the client has already booted with the previous choice.
 */
export const StorySettingsToolbar = () => {
  const client = useClient();
  const persistent = isPersistent();

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

  const handlePersistentChange = useCallback((checked: boolean) => {
    if (setPersistent(checked)) {
      window.location.reload();
    }
  }, []);

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
      <Input.Checkbox
        checked={persistent}
        onCheckedChange={({ checked }) => handlePersistentChange(checked === true)}
        label='Persistent'
      />
      <Button.Root icon='ph--trash--regular' label='Reset' onClick={() => void handleReset()} />
    </Toolbar.Root>
  );
};
