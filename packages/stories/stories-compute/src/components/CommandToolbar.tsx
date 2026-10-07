//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type LocationKind } from './types.ts';

const LOCATIONS: { value: LocationKind; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'edge', label: 'EDGE' },
];

export type CommandToolbarProps = {
  /** Offer EDGE as a location; otherwise the select is hidden. */
  edge?: boolean;
  disabled?: boolean;
  location: LocationKind;
  onLocationChange: (location: LocationKind) => void;
  onCreate: () => void;
};

/** The command panels' toolbar: spawn a process, and where. */
export const CommandToolbar = ({
  edge = false,
  disabled,
  location,
  onLocationChange,
  onCreate,
}: CommandToolbarProps) => (
  <Toolbar.Root>
    <Button.Root
      icon='ph--plus--regular'
      label='Create'
      disabled={disabled}
      onClick={onCreate}
      data-testid='process-create'
    />
    {edge && (
      <Select.Root
        items={LOCATIONS}
        value={[location]}
        onValueChange={({ value: [value] }) => {
          const next = LOCATIONS.find((item) => item.value === value);
          if (next) {
            onLocationChange(next.value);
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
);
