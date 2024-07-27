//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DXOS } from '@dxos/brand';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/react-ui-theme';

export const SplashLoader = () => {
  const [className, setClassName] = useState<string>();
  useEffect(() => {
    setTimeout(() => {
      setClassName('transition delay-1000 duration-1000 scale-0 opacity-0 _rotate-90');
    }, 100);
  }, []);

  return (
    <ThemeProvider tx={defaultTx}>
      <div className='flex flex-col bs-[100dvh] justify-center items-center bg-[#111]'>
        <div
          className={mx(
            'flex justify-center items-center w-[400px] h-[400px] rounded-[200px] bg-[#181818]',
            'scale-100 opacity-100',
            className,
          )}
        >
          <DXOS className='w-[250px] h-[250px] fill-black' />
        </div>
      </div>
      <div className='absolute left-0 right-0 bottom-0'>
        <Status indeterminate aria-label='Initializing' classNames='block is-full' />
      </div>
    </ThemeProvider>
  );
};
