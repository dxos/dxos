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
    <div role='none' className='flex w-full gap-4 py-1'>
      <Input.Root>
        <div role='none' className='flex flex-col w-full'>
          {/* TODO(burdon): Consistent height for controls (e.g., Select, Textbox, and Checkbox are all different). */}
          <Input.Label classNames='flex min-h-[40px] items-center'>{label}</Input.Label>
          {description && (
            <Input.DescriptionAndValidation classNames='mbs-0.5'>
              <Input.Description>{description}</Input.Description>
            </Input.DescriptionAndValidation>
          )}
        </div>

        <div role='none'>
          <div role='none' className='flex min-h-[40px] items-center'>
            {children}
          </div>
        </div>
      </Input.Root>
    </div>
  );
};
