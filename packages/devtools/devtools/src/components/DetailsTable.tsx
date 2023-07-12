//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { mx } from '@dxos/aurora-theme';

export type DetailsTableSlots = {
  label?: string;
};

export const DetailsTable: FC<{ object: { [index: string]: any }; slots?: DetailsTableSlots; expand?: boolean }> = ({
  object,
  slots,
  expand,
}) => {
  return (
    <div className='px-4 py-2'>
      <table className='table-fixed border-collapse __w-full'>
        <tbody>
          {Object.entries(object).map(([key, value]) => (
            <tr key={key} className='align-baseline'>
              <td className={mx('pr-2 align-baseline text-sm text-gray-500 overflow-hidden', slots?.label)}>{key}</td>
              {/* eslint-disable-next-line no-octal-escape */}
              <td className='px-2 empty:after:content-["\00a0"]'>
                <div className='font-mono overflow-x-scroll'>{value ?? ''}</div>
              </td>
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
