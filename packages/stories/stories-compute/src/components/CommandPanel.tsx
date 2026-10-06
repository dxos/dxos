//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Form, createSelectField } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import {
  MandelbrotFormValues,
  type MandelbrotParams,
  STARTING_POINTS,
  randomFormValues,
  startingPointParams,
} from '../testing/index.ts';

/** Where the user asks a process to run; the space an EDGE location needs is the story's own. */
export type LocationKind = Process.Location['kind'];

const LOCATIONS: { value: LocationKind; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'EDGE' },
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
  onCreate: (location: LocationKind, params: MandelbrotParams) => void;
};

export const CommandPanel = ({ edge = false, ready = true, error, onCreate }: CommandPanelProps) => {
  const [location, setLocation] = useState<LocationKind>('local');
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
          <Button.Root
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
