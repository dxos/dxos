//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { mx } from '@dxos/react-components';

export type DetailsTableSlots = {
  label?: string;
};

export const DetailsTable: FC<{ object: { [index: string]: any }; slots?: DetailsTableSlots; expand?: boolean }> = ({
  object,
  slots,
  expand
}) => {
  return (
    <div className='flex overflow-x-hidden'>
      <table className='table-fixed border-collapse w-full'>
        <tbody>
          {Object.entries(object).map(([key, value]) => (
            <tr key={key}>
              <td
                className={mx(
                  'py-1 pl-4 pr-1 pt-[7px] w-1/6 align-baseline text-right text-sm bg-gray-200 text-gray-500',
                  slots?.label
                )}
              >
                {key}:
              </td>
              {/* eslint-disable-next-line no-octal-escape */}
              <td className='py-1 px-2 empty:after:content-["\00a0"]'>
                <div className='overflow-x-scroll'>{value ?? ''}</div>
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
