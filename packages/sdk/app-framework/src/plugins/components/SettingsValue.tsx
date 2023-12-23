//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Input } from '@dxos/react-ui';

type SettingValueProps = {
  label: string;
};

export const SettingsValue = ({ label, children }: PropsWithChildren<SettingValueProps>) => {
  return (
    <div role='none' className='flex w-full py-2 items-center'>
      <Input.Root>
        <Input.Label classNames='grow'>{label}</Input.Label>
        {children}
      </Input.Root>
    </div>
  );
};
