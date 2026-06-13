//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Input, type SwitchProps } from '@dxos/react-ui';

import { type FormFieldRendererProps } from '#types';
import { FormFieldWrapper } from '../../FormFieldWrapper';

export const BooleanField = ({ type, readonly, onValueChange, ...props }: FormFieldRendererProps<boolean>) => {
  const handleChange = useCallback<NonNullable<SwitchProps['onCheckedChange']>>(
    (value) => onValueChange?.(type, value),
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<boolean> readonly={readonly} {...props}>
      {({ value }) => (
        // TODO(burdon) Push down to react-ui components (e.g., Input.Root).
        <div className='flex items-center px-0.5 h-8'>
          <Input.Switch disabled={!!readonly} checked={value} onCheckedChange={handleChange} />
        </div>
      )}
    </FormFieldWrapper>
  );
};
