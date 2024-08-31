//
// Copyright 2023 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { fixedBorder, attentionSurface, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out.

export type MasterDetailProps = PropsWithChildren<{
  detail?: JSX.Element;
}>;

export const MasterDetail = ({ children, detail }: MasterDetailProps) => {
  return (
    <div className={mx('flex grow overflow-hidden border-t', fixedBorder)}>
      <div className='flex w-[400px] shrink-0 border-r'>{children}</div>
      <div className={mx('flex w-full overflow-y-auto overflow-x-hidden p-4', attentionSurface)}>{detail}</div>
    </div>
  );
};
