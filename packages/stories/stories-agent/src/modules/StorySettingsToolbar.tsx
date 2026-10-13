//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useClient } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
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
