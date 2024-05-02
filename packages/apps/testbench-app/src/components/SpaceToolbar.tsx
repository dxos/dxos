//
// Copyright 2024 DXOS.org
//

import { ClockCounterClockwise, Plus, Trash, UserPlus } from '@phosphor-icons/react';
import React from 'react';

import { PublicKey } from '@dxos/client';
import { type Space } from '@dxos/react-client/echo';
import { Select, Toolbar } from '@dxos/react-ui';

export type SpaceToolbarProps = {
  spaces?: Space[];
  selected?: PublicKey;
  onCreate: () => void;
  onToggleOpen: (space: PublicKey) => void;
  onSelect: (space: PublicKey | undefined) => void;
  onInvite: (space: PublicKey) => void;
};

export const SpaceToolbar = ({
  spaces = [],
  selected,
  onCreate,
  onToggleOpen,
  onSelect,
  onInvite,
}: SpaceToolbarProps) => {
  const space = selected && spaces.find((space) => space.key.equals(selected));

  const handleChange = (value: string) => {
    onSelect(PublicKey.from(value));
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
          <Toolbar.Button onClick={() => onInvite(selected)} title='Create space.'>
            <UserPlus />
          </Toolbar.Button>
        </>
      )}
    </Toolbar.Root>
  );
};
