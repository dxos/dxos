//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { DXOS } from '@dxos/brand';
import { Button, Icon, Input } from '@dxos/react-ui';

// TODO(burdon): Factor out SettingsDialog.
export const Options = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSearch = () => {
    inputRef.current?.focus();
  };

  return (
    <div className='flex flex-col w-full p-4'>
      <div className='flex w-full gap-2 items-center'>
        <DXOS className='w-[32px] h-[32px]' />
        <h1 className='text-2xl font-thin'>Composer</h1>
      </div>

      <div className='flex flex-col w-full my-4 gap-2 divide-y divide-separator'>
        <div className='flex w-full gap-2 items-center'>
          <Input.Root>
            <Input.TextInput
              ref={inputRef}
              autoFocus
              placeholder='Enter'
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && handleSearch()}
            />
          </Input.Root>
          <Button onClick={handleSearch}>
            <Icon icon='ph--magnifying-glass--regular' size={5} />
          </Button>
        </div>
      </div>
    </div>
  );
};
