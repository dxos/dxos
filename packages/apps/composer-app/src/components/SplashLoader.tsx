//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DXOS } from '@dxos/brand';
import { Status } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const SplashLoader = () => {
  const [className, setClassName] = useState<string>();
  useEffect(() => {
    setTimeout(() => {
      setClassName('transition delay-1000 duration-1000 scale-0 opacity-0 _rotate-90 _blur-100');
    }, 100);
  }, []);

  return (
    <>
      <div className='flex flex-col bs-[100dvh] justify-center items-center bg-[#f5f5f5] dark:bg-[#111]'>
        <div
          className={mx(
            'flex justify-center items-center w-[400px] h-[400px] rounded-[200px] bg-[#eee] dark:bg-[#181818]',
            'scale-100 opacity-100',
            className,
          )}
        >
          <DXOS className='w-[250px] h-[250px] fill-[#f5f5f5] dark:fill-[#111]' />
        </div>
      </div>
      <div className='absolute left-0 right-0 bottom-0'>
        <Status indeterminate aria-label='Initializing' classNames='block is-full' />
      </div>
    </>
  );
};
