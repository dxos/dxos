//
// Copyright 2023 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Input } from '@dxos/react-ui';

export type DeprecatedFormInputProps = {
  label: string;
  description?: JSX.Element;
  secondary?: JSX.Element;
};

/**
 * @deprecated
 */
// TODO(burdon): Still used in ObservabilitySettings and all settings.
export const DeprecatedFormInput = ({
  label,
  description,
  secondary,
  children,
}: PropsWithChildren<DeprecatedFormInputProps>) => {
  const primary = (
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

  if (secondary) {
    // console.log(secondary);
    return (
      <div role='none' className='flex flex-col w-full'>
        {primary}
        {secondary}
      </div>
    );
  }

  return primary;
};
