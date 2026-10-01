//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, useCallback } from 'react';

import { Next } from '@dxos/react-ui/next';
import { getStyles } from '@dxos/ui-theme';

import { type FormFieldRendererProps } from '#types';

import { presentationFor } from '../../presentation.tsx';

type SelectRootProps = ComponentProps<typeof Next.Select.Root>;

export type SelectFieldOptions = FormFieldRendererProps & {
  options?: Array<{ value: string | number; label?: string; secondaryLabel?: string; icon?: string; iconHue?: string }>;
};

export const SelectField = ({
  type,
  readonly,
  placeholder,
  options,
  presentation,
  getValue,
  onValueChange,
  onBlur,
}: SelectFieldOptions) => {
  // A choice is a commit: the select never blurs, so it commits itself.
  const handleValueChange = useCallback<NonNullable<SelectRootProps['onValueChange']>>(
    (value) => {
      onValueChange(type, value);
      onBlur();
    },
    [type, onValueChange, onBlur],
  );

  const value = getValue();
  if (presentationFor(presentation).isStatic) {
    return (
      <p className='truncate min-w-0'>
        {options?.find(({ value: optionValue }) => optionValue === value)?.label ?? String(value ?? '')}
      </p>
    );
  }

  return (
    <Next.Select.Root
      value={[value]}
      onValueChange={({ value: [value] }) => handleValueChange(value)}
      disabled={!!readonly}
    >
      <Next.Select.Trigger classNames='w-full' disabled={!!readonly} placeholder={placeholder} />
      {options?.length !== 0 && (
        <Next.Select.Content>
          {options?.map(({ value, label, secondaryLabel, icon, iconHue }) => (
            // NOTE: Numeric values are converted to and from strings.
            <Next.Select.Item key={String(value)} value={String(value)}>
              <span className='flex items-center flex-row gap-2'>
                {icon && <Next.Icon icon={icon} classNames={getIconHueStyles(iconHue)} />}
                {label ?? String(value)}
                {secondaryLabel && <span className='text-subdued text-xs'>{secondaryLabel}</span>}
              </span>
            </Next.Select.Item>
          ))}
        </Next.Select.Content>
      )}
    </Next.Select.Root>
  );
};

const getIconHueStyles = (iconHue?: string): string | undefined => {
  const styles = iconHue ? getStyles(iconHue) : undefined;

  return styles?.fg;
};

export type SelectFieldOption = {
  value: string;
  label?: string;
};
