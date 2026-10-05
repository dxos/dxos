//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Button, Panel, Select, Toolbar } from '@dxos/react-ui';

const LOCATIONS: { value: Process.Location; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'Remote (EDGE)' },
];

export type CommandModuleProps = {
  /** Label for the remote runtime in use. */
  remote: string;
  /** False until the runtime and space exist. */
  ready?: boolean;
  error?: string;
  onCreate: (location: Process.Location) => void;
};

export const CommandModule = ({ remote, ready = true, error, onCreate }: CommandModuleProps) => {
  const [location, setLocation] = useState<Process.Location>('local');

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Select.Root
            items={LOCATIONS}
            value={[location]}
            onValueChange={({ value: [value] }) => {
              const next = LOCATIONS.find((item) => item.value === value);
              if (next) {
                setLocation(next.value);
              }
            }}
          >
            <Select.Trigger data-testid='process-location-select' />
            <Select.Content>
              {LOCATIONS.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>
          <Button
            icon='ph--plus--regular'
            label='Create'
            disabled={!ready}
            onClick={() => onCreate(location)}
            data-testid='process-create'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 text-sm'>
        <p className='text-fg-muted'>Remote runtime: {remote}</p>
        {!ready && <p className='text-fg-muted'>Initializing…</p>}
        {error && (
          <p className='text-error-text' data-testid='process-error'>
            {error}
          </p>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};
