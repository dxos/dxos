//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { composable, composableProps } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

export type PendingProps = {
  label: string;
};

/** Centered spinner shown while content is being generated. Composable: forwards ref + slot props. */
export const Pending = composable<HTMLDivElement, PendingProps>(({ classNames, label, ...props }, forwardedRef) => (
  <div
    {...composableProps(props, { classNames: ['grid place-items-center w-full p-4 text-description', classNames] })}
    ref={forwardedRef}
  >
    <span className='flex items-center gap-1'>
      <Next.Icon icon='ph--spinner--regular' spin />
      {label}
    </span>
  </div>
));
