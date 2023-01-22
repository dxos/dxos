//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

export const DetailsTable: FC<{ object: { [index: string]: any }; expand?: boolean }> = ({ object, expand }) => {
  return (
    <div>
      <table className='table-fixed border-collapse'>
        <tbody>
          {Object.entries(object).map(([key, value]) => (
            <tr key={key}>
              <td className='py-1 pl-4 pr-1 pt-[7px] align-baseline text-right text-sm bg-gray-200 text-gray-500'>
                {key}:
              </td>
              <td className='py-1 px-2'>{value ?? ''}</td>
            </tr>
          ))}
          {expand && (
            <tr className='h-screen'>
              <td className='bg-gray-200' />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
