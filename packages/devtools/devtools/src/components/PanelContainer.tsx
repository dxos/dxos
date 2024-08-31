//
// Copyright 2023 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';

import { type ClassNameValue } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const PanelContainer: FC<{
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  classNames?: ClassNameValue;
}> = ({ toolbar, footer, children, classNames }) => {
  return (
    <div className='flex grow flex-col overflow-hidden'>
      {toolbar}
      <div className={mx('flex grow flex-col overflow-auto', classNames)}>{children}</div>
      {footer}
    </div>
  );
};
