//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';

export const Table: FC<{ sidebar: ReactNode; header: ReactNode; children?: ReactNode }> = ({
  sidebar,
  header,
  children
}) => {
  return (
    <div className='flex'>
      <table className='table-fixed w-full overflow-hidden'>
        <tbody>
          <tr>
            <td className='w-8'>
              <div className='flex m-1'>{sidebar}</div>
            </td>
            <td>
              <div>{header}</div>
            </td>
          </tr>
          <tr>
            <td></td>
            <td>
              <div className='flex flex-col'>{children}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
