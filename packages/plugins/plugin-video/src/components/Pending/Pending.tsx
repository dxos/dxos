//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Icon from '@dxos/react-ui/Icon';
import * as Util from '@dxos/react-ui/Util';

export type PendingProps = {
  label: string;
};

/** Centered spinner shown while content is being generated. Composable: forwards ref + slot props. */
export const Pending = Util.composable<HTMLDivElement, PendingProps>(
  ({ classNames, label, ...props }, forwardedRef) => (
    <div
      {...Util.composableProps(props, {
        classNames: ['grid place-items-center w-full p-4 text-description', classNames],
      })}
      ref={forwardedRef}
    >
      <span className='flex items-center gap-1'>
        <Icon.Root icon='ph--spinner--regular' classNames='animate-spin' />
        {label}
      </span>
    </div>
  ),
);
