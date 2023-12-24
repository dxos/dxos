//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Input } from '@dxos/react-ui';

type SettingValueProps = {
  label: string;
  description?: JSX.Element;
};

export const SettingsValue = ({ label, description, children }: PropsWithChildren<SettingValueProps>) => {
  return (
    <div role='none' className='flex w-full items-center gap-4 py-2'>
      <Input.Root>
        <div role='none' className='grow'>
          <Input.Label>{label}</Input.Label>
          {description && (
            <Input.DescriptionAndValidation classNames='mbs-0.5'>
              <Input.Description>{description}</Input.Description>
            </Input.DescriptionAndValidation>
          )}
        </div>

        {children}
      </Input.Root>
    </div>
  );
};
