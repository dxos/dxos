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
    <div>
      <table className='table-fixed border-collapse'>
        <tbody>
          {Object.entries(object).map(([key, value]) => (
            <tr key={key} className='align-baseline'>
              <td className={mx('px-4 align-baseline text-sm text-gray-500 overflow-hidden', slots?.keys?.className)}>
                {key}
              </td>
              {/* eslint-disable-next-line no-octal-escape */}
              <td className='px-2 empty:after:content-["\00a0"]'>
                <div className='font-mono overflow-x-scroll'>{value ?? ''}</div>
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
