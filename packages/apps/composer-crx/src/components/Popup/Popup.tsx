//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { IconButton, Input, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Authenticate with passkey..

type PopupProps = ThemedClassName<{
  onLaunch?: () => void;
}>;

export const Popup = ({ classNames, onLaunch }: PopupProps) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={mx('flex flex-col gap-2 bg-baseSurface', classNames)}>
      <Toolbar.Root>
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
        <IconButton icon='ph--plus--regular' iconOnly label='add button' onClick={onLaunch} />
      </Toolbar.Root>
      <div className='grow' />
    </div>
  );
};
