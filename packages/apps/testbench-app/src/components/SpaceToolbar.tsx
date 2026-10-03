//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/client';
import { type Space } from '@dxos/react-client/echo';
import { Button, Select, Toolbar } from '@dxos/react-ui';

export type SpaceToolbarProps = {
  spaces?: Space[];
  selected?: PublicKey;
  onCreate: () => void;
  onImport: (blob: Blob) => void;
  onSelect: (space: PublicKey | undefined) => void;
  onToggleOpen: (space: PublicKey) => void;
  onExport: (space: PublicKey) => void;
  onInvite: (space: PublicKey) => void;
};

export const SpaceToolbar = ({
  spaces = [],
  selected,
  onCreate,
  onImport,
  onSelect,
  onToggleOpen,
  onExport,
  onInvite,
}: SpaceToolbarProps) => {
  const space = selected && spaces.find((space) => space.key.equals(selected));

  const handleChange = (value: string) => {
    onSelect(PublicKey.from(value));
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        onImport(file);
      }
    };
    input.click();
  };

  return (
    <Toolbar.Root>
      <Button icon='ph--plus--regular' label='Create space.' onClick={() => onCreate()} />
      <div className='flex w-32'>
        <Select.Root
          items={spaces.map((space) => ({ value: space.key.toHex(), label: space.key.truncate() }))}
          value={selected ? [selected.toHex()] : []}
          onValueChange={({ value: [value] }) => value && handleChange(value)}
        >
          <Select.Trigger classNames='w-full' />
          <Select.Content>
            {spaces.map((space) => (
              <Select.Item
                key={space.key.toHex()}
                classNames='font-mono'
                item={{ value: space.key.toHex(), label: space.key.truncate() }}
              />
            ))}
          </Select.Content>
        </Select.Root>
      </div>
      <div className='flex gap-1'>
        <span>{spaces.length}</span>
        <span>Space(s)</span>
      </div>
      <div className='grow' />
      {space && (
        <>
          <Button
            icon={space.isOpen ? 'ph--trash--regular' : 'ph--clock-counter-clockwise--regular'}
            iconOnly
            label={space.isOpen ? 'Close space' : 'Open space'}
            onClick={() => onToggleOpen(selected)}
          />
          <Button icon='ph--upload-simple--regular' label='Import space.' onClick={handleImport} />
          <Button
            icon='ph--download-simple--regular'
            iconOnly
            label='Download backup'
            onClick={() => onExport(selected)}
          />
          <Button
            icon='ph--user-plus--regular'
            iconOnly
            label='Share'
            onClick={() => onInvite(selected)}
            variant='primary'
          />
        </>
      )}
    </Toolbar.Root>
  );
};
