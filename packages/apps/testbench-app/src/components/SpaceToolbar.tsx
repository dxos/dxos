//
// Copyright 2024 DXOS.org
//

import { ClockCounterClockwise, DownloadSimple, Plus, Trash, UploadSimple, UserPlus } from '@phosphor-icons/react';
import React from 'react';

import { PublicKey } from '@dxos/client';
import { type Space } from '@dxos/react-client/echo';
import { Select, Toolbar } from '@dxos/react-ui';

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
    <Toolbar.Root classNames='p-1'>
      <Toolbar.Button title='Create space.' onClick={() => onCreate()}>
        <Plus />
      </Toolbar.Button>
      <div className='flex w-32'>
        <Select.Root value={selected?.toHex()} onValueChange={handleChange}>
          <Select.TriggerButton classNames='is-full' />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {spaces.map((space) => (
                  <Select.Option key={space.key.toHex()} value={space.key.toHex()}>
                    <span className='font-mono'>{space.key.truncate()}</span>
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
      <div className='flex gap-1'>
        <span>{spaces.length}</span>
        <span>Space(s)</span>
      </div>
      <div className='grow' />
      {space && (
        <>
          <Toolbar.Button onClick={() => onToggleOpen(selected)} title={space.isOpen ? 'Close space.' : 'Open space.'}>
            {space.isOpen ? <Trash /> : <ClockCounterClockwise />}
          </Toolbar.Button>
          <Toolbar.Button onClick={handleImport} title='Import space.'>
            <UploadSimple />
          </Toolbar.Button>
          <Toolbar.Button onClick={() => onExport(selected)} title='Download backup.'>
            <DownloadSimple />
          </Toolbar.Button>
          <Toolbar.Button onClick={() => onInvite(selected)} title='Share.' variant='primary'>
            <UserPlus />
          </Toolbar.Button>
        </>
      )}
    </Toolbar.Root>
  );
};
