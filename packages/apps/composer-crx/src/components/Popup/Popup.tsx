//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Button, Icon, Input } from '@dxos/react-ui';

export const Popup = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSearch = () => {
    inputRef.current?.focus();
  };

  const handleLaunch = () => {
    window.open('https://composer.space');
  };

  return (
    <div className='flex flex-col w-[300px] p-2 gap-2 bg-base'>
      <div className='flex gap-2 items-center'>
        <Button onClick={handleLaunch}>
          <Icon icon='ph--copyright--thin' size={5} />
        </Button>
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
  );
};
