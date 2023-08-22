//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

export type DetailsTableSlots = {
  keys?: { className?: string };
};

export const DetailsTable: FC<{ object: { [index: string]: any }; slots?: DetailsTableSlots; expand?: boolean }> = ({
  object,
  slots,
  expand = false,
}) => {
  return (
    <div className='flex m-2 py-2 overflow-auto border bg-neutral-50'>
      <table className='table-fixed border-collapse'>
        <tbody>
          {Object.entries(object).map(([key, value]) => (
            <tr key={key} className='align-baseline leading-6'>
              <td className={mx('px-4 align-baseline text-gray-500 overflow-hidden', slots?.keys?.className)}>{key}</td>
              <td>
                <div className='font-mono overflow-x-scroll'>{value}</div>
              </td>
            </tr>
          ))}

          {expand && (
            <tr className='h-screen'>
              <td className={slots?.keys?.className} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
