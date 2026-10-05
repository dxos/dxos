//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Button, Panel, Select, Toolbar } from '@dxos/react-ui';

import { DEFAULT_SIZE, type Point, POINTS, SIZES } from '../testing/index.ts';

const LOCATIONS: { value: Process.Location; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'Remote (EDGE)' },
];

const RANDOM = 'random';
const STARTS: { value: string; label: string; point?: Point }[] = [
  { value: RANDOM, label: 'Random' },
  ...POINTS.map(({ name, point }) => ({ value: name, label: name, point })),
];

const RESOLUTIONS = SIZES.map((size) => ({ value: String(size), label: `${size}×${size}`, size }));

export type CommandPanelProps = {
  /** Label for the remote runtime in use. */
  remote: string;
  /** False until the runtime and space exist. */
  ready?: boolean;
  error?: string;
  /** `center` is absent for a random start. */
  onCreate: (location: Process.Location, size: number, center?: Point) => void;
};

export const CommandPanel = ({ remote, ready = true, error, onCreate }: CommandPanelProps) => {
  const [location, setLocation] = useState<Process.Location>('local');
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [start, setStart] = useState(RANDOM);

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
          <Select.Root
            items={RESOLUTIONS}
            value={[String(size)]}
            onValueChange={({ value: [value] }) => {
              const next = RESOLUTIONS.find((item) => item.value === value);
              if (next) {
                setSize(next.size);
              }
            }}
          >
            <Select.Trigger data-testid='process-size-select' />
            <Select.Content>
              {RESOLUTIONS.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>
          <Select.Root items={STARTS} value={[start]} onValueChange={({ value: [value] }) => value && setStart(value)}>
            <Select.Trigger data-testid='process-start-select' />
            <Select.Content>
              {STARTS.map((item) => (
                <Select.Item key={item.value} item={item} />
              ))}
            </Select.Content>
          </Select.Root>
          <Button
            icon='ph--plus--regular'
            label='Create'
            disabled={!ready}
            onClick={() => onCreate(location, size, STARTS.find((item) => item.value === start)?.point)}
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
