//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { Form, createSelectField } from '@dxos/react-ui-form';
import * as Panel from '@dxos/react-ui/Panel';

import {
  MandelbrotFormValues,
  type MandelbrotParams,
  STARTING_POINTS,
  randomFormValues,
  startingPointParams,
} from '../testing/index.ts';
import { CommandToolbar } from './CommandToolbar.tsx';
import { type LocationKind } from './types.ts';

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
        <CommandToolbar
          edge={edge}
          disabled={!ready}
          location={location}
          onLocationChange={setLocation}
          onCreate={handleCreate}
        />
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
