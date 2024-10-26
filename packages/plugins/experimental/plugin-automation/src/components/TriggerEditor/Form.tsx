//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Input } from '@dxos/react-ui';

export const InputRow = ({ label, children }: PropsWithChildren<{ label?: string }>) => (
  <Input.Root>
    <tr>
      <td className='w-[80px] px-2 text-right align-top pt-3 overflow-hidden'>
        <Input.Label classNames='truncate text-xs'>{label}</Input.Label>
      </td>
      <td className='p-1 pr-2'>{children}</td>
    </tr>
  </Input.Root>
);
