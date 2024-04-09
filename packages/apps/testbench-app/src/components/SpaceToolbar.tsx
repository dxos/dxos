//
// Copyright 2024 DXOS.org
//

import { Plus, UserPlus } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client/echo';
import { Select, Toolbar } from '@dxos/react-ui';

export type SpaceToolbarProps = {
  onCreate: () => Promise<PublicKey>;
  onSelect: (space: PublicKey | undefined) => void;
  onInvite: (space: PublicKey) => void;
};

export const SpaceToolbar = ({ onCreate, onSelect, onInvite }: SpaceToolbarProps) => {
  const spaces = useSpaces();
  const [spaceKey, setSpaceKey] = useState<PublicKey | undefined>(spaces[0]?.key);
  useEffect(() => {
    onSelect(spaceKey);
  }, [spaceKey]);

  const handleCreate = async () => {
    const key = await onCreate();
    setSpaceKey(key);
  };

  return (
    <Toolbar.Root classNames='p-1'>
      <Toolbar.Button onClick={handleCreate} title='Create space.'>
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
      <div className='grow' />
      <Toolbar.Button onClick={() => spaceKey && onInvite(spaceKey)} title='Create space.'>
        <UserPlus />
      </Toolbar.Button>
    </Toolbar.Root>
  );
};
