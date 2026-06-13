//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, composable, composableProps } from '@dxos/react-ui';

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
      <Icon icon='ph--spinner--regular' classNames='animate-spin' />
      {label}
    </span>
  </div>
));
