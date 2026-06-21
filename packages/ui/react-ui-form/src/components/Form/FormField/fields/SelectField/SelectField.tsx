//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, Select, type SelectRootProps } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

import { FormFieldWrapper } from '../../FormFieldWrapper';

export type SelectFieldOptions = FormFieldRendererProps & {
  options?: Array<{ value: string | number; label?: string; secondaryLabel?: string; icon?: string; iconHue?: string }>;
};

export const SelectField = ({ type, readonly, placeholder, options, onValueChange, ...props }: SelectFieldOptions) => {
  const handleValueChange = useCallback<NonNullable<SelectRootProps['onValueChange']>>(
    (value) => onValueChange(type, value),
    [type, onValueChange],
  );

  return (
    <FormFieldWrapper<string>
      readonly={readonly}
      renderStatic={(value) => (
        <p className='truncate min-w-0'>
          {options?.find(({ value: optionValue }) => optionValue === value)?.label ?? String(value)}
        </p>
      )}
      {...props}
    >
      {({ value }) => (
        <Select.Root value={value} onValueChange={handleValueChange}>
          {/* TODO(burdon): Placeholder not working? */}
          <Select.TriggerButton classNames='w-full' disabled={!!readonly} placeholder={placeholder} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {options?.map(({ value, label, secondaryLabel, icon, iconHue }) => (
                  // NOTE: Numeric values are converted to and from strings.
                  <Select.Option key={String(value)} value={String(value)}>
                    <span className='flex items-center flex-row gap-2'>
                      {icon && <Icon icon={icon} classNames={getIconHueStyles(iconHue)} />}
                      {label ?? String(value)}
                      {secondaryLabel && <span className='text-subdued text-xs'>{secondaryLabel}</span>}
                    </span>
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
    </FormFieldWrapper>
  );
};

const getIconHueStyles = (iconHue?: string): string | undefined => {
  const styles = iconHue ? getStyles(iconHue) : undefined;

  return styles?.fg;
};
