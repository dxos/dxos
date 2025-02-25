//
// Copyright 2023 DXOS.org
//

import React, { type JSX, type PropsWithChildren } from 'react';

import { Input, type ThemedClassName } from '@dxos/react-ui';
import { mx, textBlockWidth } from '@dxos/react-ui-theme';

/**
 * @deprecated
 */
export const DeprecatedFormContainer = ({ children, classNames }: ThemedClassName<PropsWithChildren>) => {
  return (
    <div role='none' className='w-full p-4 justify-center overflow-x-hidden overflow-y-auto'>
      <div role='form' className={mx('flex flex-col', textBlockWidth, classNames)}>
        {children}
      </div>
    </div>
  );
};

export type DeprecatedFormInputProps = {
  label: string;
  description?: JSX.Element;
  secondary?: JSX.Element;
};

/**
 * @deprecated
 */
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
          <Input.Label classNames='flex min-bs-[--rail-action] items-center' style={{ fontSize: 'unset' }}>
            {label}
          </Input.Label>
          {description && (
            <Input.DescriptionAndValidation classNames='mbs-0.5'>
              <Input.Description>{description}</Input.Description>
            </Input.DescriptionAndValidation>
          )}
        </div>

        <div role='none'>
          <div role='none' className='flex min-bs-[--rail-action] items-center'>
            {children}
          </div>
        </div>
      </Input.Root>
    </div>
  );

  if (secondary) {
    return (
      <div role='none'>
        {primary}
        {secondary}
      </div>
    );
  }

  return primary;
};
