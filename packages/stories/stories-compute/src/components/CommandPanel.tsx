//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Button, Panel, Select, Toolbar } from '@dxos/react-ui';
import { Form, createSelectField } from '@dxos/react-ui-form';

import {
  MandelbrotFormValues,
  type MandelbrotParams,
  STARTING_POINTS,
  randomFormValues,
  startingPointParams,
} from '../testing/index.ts';

const LOCATIONS: { value: Process.Location; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'Remote (EDGE)' },
];

const fieldMap = {
  preset: createSelectField({ options: STARTING_POINTS.map(({ name }) => name), defaultLabel: null }),
};

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
  const [values, setValues] = useState<MandelbrotFormValues>(randomFormValues);

  // Picking a preset moves the start to it; editing the start by hand keeps the last preset's name.
  const handleValuesChanged = (next: Partial<MandelbrotFormValues>) =>
    setValues((previous) => {
      const start =
        next.preset !== undefined && next.preset !== previous.preset
          ? STARTING_POINTS.find(({ name }) => name === next.preset)
          : undefined;
      return { ...previous, ...next, ...(start ? startingPointParams(start) : {}) };
    });

  const handleCreate = () => {
    const { preset: _preset, ...params } = values;
    onCreate(edge ? location : 'local', params);
  };

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button
            icon='ph--plus--regular'
            label='Create'
            disabled={!ready}
            onClick={handleCreate}
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
          schema={MandelbrotFormValues}
          values={values}
          fieldMap={fieldMap}
          testId='mandelbrot-params'
          onValuesChanged={handleValuesChanged}
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
