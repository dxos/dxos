//
// Copyright 2024 DXOS.org
//

import { Plus, Trash, UserPlus } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import { type PublicKey } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Select, Toolbar } from '@dxos/react-ui';

import { useControlledValue } from '../hooks';

export type SpaceToolbarProps = {
  spaceKey?: PublicKey;
  onCreate: () => void;
  onClose: (space: PublicKey) => void;
  onSelect: (space: PublicKey | undefined) => void;
  onInvite: (space: PublicKey) => void;
};

export const SpaceToolbar = ({ spaceKey: _spaceKey, onCreate, onClose, onSelect, onInvite }: SpaceToolbarProps) => {
  const client = useClient();
  const spaces = useSpaces().filter((space) => space !== client.spaces.default);
  const [spaceKey, setSpaceKey] = useControlledValue<PublicKey | undefined>(_spaceKey, onSelect);
  useEffect(() => {
    if (!_spaceKey && spaces.length) {
      setSpaceKey(spaces[0].key);
    }
  }, []);

  return (
    <Toolbar.Root classNames='p-1'>
      <Toolbar.Button title='Create space.' onClick={() => onCreate()}>
        <Plus />
      </Toolbar.Button>
      <div className='flex w-32'>
        <Select.Root
          value={spaceKey?.toHex()}
          onValueChange={(value) => setSpaceKey(spaces.find((space) => space.key.toHex() === value)?.key)}
        >
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
      {spaceKey && (
        <>
          <Toolbar.Button onClick={() => onClose(spaceKey)} title='Close space.'>
            <Trash />
          </Toolbar.Button>
          <Toolbar.Button onClick={() => onInvite(spaceKey)} title='Create space.'>
            <UserPlus />
          </Toolbar.Button>
        </>
      )}
    </Toolbar.Root>
  );
};
