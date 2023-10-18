//
// Copyright 2023 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

export const PanelContainer: FC<{
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ toolbar, footer, children, className }) => {
  return (
    <div className='flex flex-col grow overflow-hidden'>
      {toolbar}
      <div className={mx('flex flex-col grow overflow-auto', className)}>{children}</div>
      {footer}
    </div>
  );
};
