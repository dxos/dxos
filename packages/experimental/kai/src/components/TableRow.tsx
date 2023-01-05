//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

export const TableRow: FC<{ sidebar?: ReactNode; action?: ReactNode; header: ReactNode; children?: ReactNode }> = ({
  sidebar,
  action,
  header,
  children
}) => {
  return (
    <div className='flex flex-col pl-2 pr-2'>
      <div className='flex items-center'>
        {sidebar && <div className='flex flex-shrink-0 mr-2'>{sidebar}</div>}
        <div className='flex flex-1'>{header}</div>
        {action && <div className='flex ml-2'>{action}</div>}
      </div>
      {children && <div className='flex flex-col'>{children}</div>}
    </div>
  );
};
