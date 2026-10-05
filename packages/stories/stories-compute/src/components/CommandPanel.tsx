//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Button, Panel, Select, Toolbar } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { MandelbrotParams, randomParams } from '../testing/index.ts';

const LOCATIONS: { value: Process.Location; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'Remote (EDGE)' },
];

export type CommandPanelProps = {
  /** Offer EDGE as a location; otherwise every process spawns locally. */
  edge?: boolean;
  /** False until the runtime and space exist. */
  ready?: boolean;
  error?: string;
  onCreate: (location: Process.Location, params: MandelbrotParams) => void;
};

export const CommandPanel = ({ edge = false, ready = true, error, onCreate }: CommandPanelProps) => {
  const [location, setLocation] = useState<Process.Location>('local');
  const [params, setParams] = useState<MandelbrotParams>(randomParams);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button
            icon='ph--plus--regular'
            label='Create'
            disabled={!ready}
            onClick={() => onCreate(edge ? location : 'local', params)}
            data-testid='process-create'
          />
          {edge && (
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
          )}
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
