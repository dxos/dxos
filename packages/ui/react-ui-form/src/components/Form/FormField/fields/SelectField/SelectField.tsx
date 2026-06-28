//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { type SelectRootProps, Icon, Select } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

import { type FormFieldRenderer, type FormFieldRendererProps } from '#types';

import { FormRow } from '../../FormRow';

export type SelectFieldOptions = FormFieldRendererProps & {
  options?: Array<{ value: string | number; label?: string; secondaryLabel?: string; icon?: string; iconHue?: string }>;
};

export const SelectField = ({ type, readonly, placeholder, options, onValueChange, ...props }: SelectFieldOptions) => {
  const handleValueChange = useCallback<NonNullable<SelectRootProps['onValueChange']>>(
    (value) => onValueChange(type, value),
    [type, onValueChange],
  );

  return (
    <FormRow<string>
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
    </FormRow>
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

export type CreateSelectFieldOptions = {
  /** Options to display. Strings are used as both value and label. */
  options: ReadonlyArray<string | SelectFieldOption>;
  /** Label for the sentinel option that maps to `undefined`. Defaults to `'Default'`. Pass `null` to omit. */
  defaultLabel?: string | null;
};

/**
 * Factory for a `fieldMap` entry (keyed by JSON path) that renders a Select over a fixed list of
 * options, with an optional sentinel mapping to `undefined`. Use for fields whose choices come from a
 * runtime list rather than the schema (e.g. available model ids).
 */
export const createSelectField = ({
  options,
  defaultLabel = 'Default',
}: CreateSelectFieldOptions): FormFieldRenderer => {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  const hasDefault = defaultLabel !== null;
  // The sentinel maps to `undefined`. Radix forbids an empty-string `Select.Item` value, so use a
  // non-empty placeholder; reserved (a real option with this value would be unrepresentable).
  const sentinel = '__default__';
  invariant(
    !normalized.some((option) => option.value === sentinel),
    `createSelectField: option value '${sentinel}' is reserved.`,
  );
  return ({ type, readonly, onValueChange, ...props }: FormFieldRendererProps<string | undefined>) => (
    <FormRow<string>
      readonly={readonly}
      renderStatic={(value) => (
        <p className='truncate min-w-0'>
          {normalized.find((option) => option.value === value)?.label ?? String(value ?? '')}
        </p>
      )}
      {...props}
    >
      {({ value }) => (
        <Select.Root
          disabled={!!readonly}
          value={value ?? sentinel}
          onValueChange={(next) => onValueChange(type, hasDefault && next === sentinel ? undefined : next)}
        >
          <Select.TriggerButton classNames='w-full' disabled={!!readonly} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {hasDefault && <Select.Option value={sentinel}>{defaultLabel}</Select.Option>}
                {normalized.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    {option.label ?? option.value}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
    </FormRow>
  );
};
