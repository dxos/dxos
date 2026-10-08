//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Util from '@dxos/react-ui/Util';

export type PendingProps = {
  label: string;
};

/** Centered spinner shown while content is being generated. Composable: forwards ref + slot props. */
export const Pending = Util.composable<HTMLDivElement, PendingProps>(
  ({ classNames, label, ...props }, forwardedRef) => (
    <Layout.Grid
      center
      {...Util.composableProps(props, { classNames: ['w-full p-4 text-fg-muted', classNames] })}
      ref={forwardedRef}
    >
      <span className='flex items-center gap-1'>
        <Icon.Icon icon='ph--spinner--regular' spin />
        {label}
      </span>
    </Layout.Grid>
  ),
);
