//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

/**
 * @deprecated
 */
export const CardRow: FC<{ sidebar?: ReactNode; action?: ReactNode; header: ReactNode; children?: ReactNode }> = ({
  sidebar,
  action,
  header,
  children
}) => {
  return (
    <div className='flex flex-col w-full p-1 pl-2 pr-2'>
      <div className='flex items-center'>
        {sidebar && <div className='flex shrink-0 justify-center w-6 mr-2'>{sidebar}</div>}
        <div className='flex flex-1'>{header}</div>
        {action && <div className='flex ml-2 w-6'>{action}</div>}
      </div>

      {children && <div className='flex flex-col'>{children}</div>}
    </div>
  );
};
