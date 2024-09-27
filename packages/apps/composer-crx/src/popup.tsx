//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { Button, DensityProvider, Icon, Input, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

const Root = () => {
  // TODO(burdon): Fix dark mode.
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSearch = () => {
    inputRef.current?.focus();
  };

  return (
    <div className='dark'>
      <ThemeProvider tx={defaultTx} themeMode='dark'>
        <DensityProvider density='fine'>
          <div className='flex flex-col w-[300px] p-2 gap-2 bg-base'>
            <div className='flex gap-2 items-center'>
              <Input.Root>
                <Input.TextInput ref={inputRef} autoFocus placeholder='Enter' />
              </Input.Root>
              <Button onClick={handleSearch}>
                <Icon icon='ph--magnifying-glass--regular' size={5} />
              </Button>
            </div>
          </div>
        </DensityProvider>
      </ThemeProvider>
    </div>
  );
};

const main = async () => {
  createRoot(document.getElementById('root')!).render(<Root />);
};

void main();
