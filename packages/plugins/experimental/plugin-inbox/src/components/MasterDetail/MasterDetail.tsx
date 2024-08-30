//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { fixedBorder, attentionSurface, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out.

export type MasterDetailProps = PropsWithChildren<{
  detail?: JSX.Element;
}>;

export const MasterDetail = ({ children, detail }: MasterDetailProps) => {
  return (
    <div className={mx('flex grow overflow-hidden border-t', fixedBorder)}>
      <div className='flex shrink-0 w-[400px] border-r'>{children}</div>
      <div className={mx('flex w-full overflow-x-hidden overflow-y-auto p-4', attentionSurface)}>{detail}</div>
    </div>
  );
};
