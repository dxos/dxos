//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

export const Card: FC<{ menubar: ReactNode; children: ReactNode | ReactNode[] }> = ({ menubar, children }) => {
  return (
    <div className='flex flex-1 flex-col drop-shadow-md border-sky-500'>
      {menubar}
      <div className='flex flex-1 flex-col overflow-y-scroll bg-white'>{children}</div>
    </div>
  );
};
