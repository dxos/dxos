//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Button, Panel, Select, Toolbar } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { DEFAULT_SIZE, MandelbrotParams } from '../testing/index.ts';

const LOCATIONS: { value: Process.Location; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'Remote (EDGE)' },
];

export type CommandPanelProps = {
  /** Label for the remote runtime in use. */
  remote: string;
  /** False until the runtime and space exist. */
  ready?: boolean;
  error?: string;
  onCreate: (location: Process.Location, params: MandelbrotParams) => void;
};

export const CommandPanel = ({ remote, ready = true, error, onCreate }: CommandPanelProps) => {
  const [location, setLocation] = useState<Process.Location>('local');
  const [params, setParams] = useState<MandelbrotParams>({ size: DEFAULT_SIZE });

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
            onClick={() => onCreate(location, params)}
            data-testid='process-create'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Form.Root
          schema={MandelbrotParams}
          values={params}
          testId='mandelbrot-params'
          onValuesChanged={(next) => setParams((previous) => ({ ...previous, ...next }))}
        >
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Body>
      <Panel.Footer classNames='p-2 text-sm'>
        <p className='text-fg-muted'>Remote runtime: {remote}</p>
        {!ready && <p className='text-fg-muted'>Initializing…</p>}
        {error && (
          <p className='text-error-text' data-testid='process-error'>
            {error}
          </p>
        )}
      </Panel.Footer>
    </Panel.Root>
  );
};
