//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, Input, Select, type SelectRootProps } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export type SelectFieldOptions = FormFieldComponentProps & {
  options?: Array<{ value: string | number; label?: string; secondaryLabel?: string; icon?: string; iconHue?: string }>;
};

export const SelectField = ({
  type,
  readonly,
  label,
  jsonPath,
  layout,
  placeholder,
  options,
  getStatus,
  getValue,
  onValueChange,
}: SelectFieldOptions) => {
  const { status, error } = getStatus();
  const value = getValue() as string | undefined;

  const handleValueChange = useCallback<NonNullable<SelectRootProps['onValueChange']>>(
    (value) => onValueChange(type, value),
    [type, onValueChange],
  );

  if ((readonly || layout === 'static') && value == null) {
    return null;
  }

  return (
    <Input.Root validationValence={status}>
      {layout !== 'inline' && <FormFieldLabel error={error} readonly={readonly} label={label} path={jsonPath} />}
      {layout === 'static' ? (
        <p>{options?.find(({ value: optionValue }) => optionValue === value)?.label ?? String(value)}</p>
      ) : (
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
      {layout === 'full' && <Input.DescriptionAndValidation>{error}</Input.DescriptionAndValidation>}
    </Input.Root>
  );
};

const getIconHueStyles = (iconHue?: string): string | undefined => {
  const styles = iconHue ? getStyles(iconHue) : undefined;

  return styles?.fg;
};
