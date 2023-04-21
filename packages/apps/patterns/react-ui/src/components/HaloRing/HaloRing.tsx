//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Pulse, getSize, mx } from '@dxos/react-components';

export type HaloRingProps = PropsWithChildren & {
  loading?: boolean;
  status?: 'active' | 'inactive' | undefined;
  className?: string;
};

export const HaloRing = (props: HaloRingProps) => {
  const { loading, className, children, status } = { ...props };
  const w = 12;
  return (
    <div className={mx(getSize(w), 'rounded-full relative inline-block m-auto', className)}>
      <div
        className={mx(
          'opacity-50 rounded-full border-2 w-full h-full absolute',
          loading
            ? ' animate-pulse-late border-neutral-100'
            : status === 'active'
            ? 'border-emerald-350 opacity-80'
            : status === 'inactive'
            ? 'border-amber-400'
            : 'border-neutral-100'
        )}
      ></div>
      <div
        className={`rounded-full ${
          loading ? 'bg-neutral-250' : 'bg-neutral-100'
        } dark:bg-neutral-700 absolute inset-1 overflow-hidden flex justify-center content-center items-center`}
      >
        {children}
      </div>
      {loading && <Pulse className='absolute inset-1 stroke-neutral-100 dark:stroke-neutral-400' size={0} />}
    </div>
  );
};
