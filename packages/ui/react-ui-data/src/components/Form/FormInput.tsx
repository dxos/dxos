//
// Copyright 2024 DXOS.org
//

import React, { type JSX } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { type SimpleType } from '@dxos/effect';
import { Input, Select } from '@dxos/react-ui';
import { type PropertyKey } from '@dxos/schema';

import { type FormHandler } from '../../hooks';

/**
 * The default FormInput can only handle the following types (subset of SimpleType).
 */
export const isDefaultInputType = (type: SimpleType, format?: FormatEnum): boolean => {
  return ['string', 'number', 'boolean'].includes(type) || (format ? [FormatEnum.LatLng].includes(format) : false);
};

// TODO(burdon): Use SchemaProperty.
export type FormInputProps<T extends object = {}> = {
  property: PropertyKey<T>;
  type: SimpleType;
  format?: FormatEnum;
  label: string;
  options?: Array<{ value: string | number; label?: string }>;
  disabled?: boolean;
  placeholder?: string;
} & Pick<FormHandler<T>, 'getErrorValence' | 'getErrorMessage' | 'getValue' | 'onValueChange' | 'onBlur'>;

/**
 *
 */
// TODO(burdon): Handle hierarchical forms using JsonPath.
export const FormInput = <T extends object = {}>({
  property,
  type,
  format,
  label,
  options,
  disabled,
  placeholder,
  getErrorValence,
  getErrorMessage,
  getValue,
  onValueChange,
  onBlur,
}: FormInputProps<T>): JSX.Element => {
  const errorValence = getErrorValence?.(property);
  const errorMessage = getErrorMessage?.(property);

  //
  // Select with provided options.
  //

  if (options) {
    return (
      <Input.Root validationValence={errorValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Select.Root value={getValue(property, type)} onValueChange={(value) => onValueChange(property, type, value)}>
            {/* TODO(burdon): Placeholder not working? */}
            <Select.TriggerButton classNames='is-full' disabled={disabled} placeholder={placeholder} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {options.map(({ value, label }) => (
                    // Note: Numeric values are converted to and from strings.
                    <Select.Option key={String(value)} value={String(value)}>
                      {label ?? String(value)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }

  //
  // Boolean switch.
  //

  if (type === 'boolean') {
    return (
      <Input.Root validationValence={errorValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Input.Switch
            checked={getValue<boolean>(property, type)}
            onCheckedChange={(value) => onValueChange(property, type, value)}
          />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }

  //
  // Text input.
  //

  // TODO(burdon): Restrict string pattern (i.e., input masking based on schema).
  // TODO(burdon): Prevent negative numbers based on annotation.
  // TODO(burdon): Don't show number picker unless bounded integer annotation.
  if (type === 'string' || type === 'number') {
    return (
      <Input.Root validationValence={errorValence}>
        <Input.Label>{label}</Input.Label>
        <Input.DescriptionAndValidation>
          <Input.TextInput
            type={type}
            disabled={disabled}
            placeholder={placeholder}
            value={getValue(property, type) ?? (type === 'string' ? '' : 0)}
            onChange={(event) => onValueChange(property, type, event.target.value)}
            onBlur={onBlur}
          />
          <Input.Validation>{errorMessage}</Input.Validation>
        </Input.DescriptionAndValidation>
      </Input.Root>
    );
  }

  //
  // Object renderers.
  // TODO(burdon): Create registry
  //

  if (type === 'object') {
    if (format === FormatEnum.LatLng) {
      return (
        <Input.Root validationValence={errorValence}>
          <Input.Label>{label}</Input.Label>
          <div className='grid grid-cols-2 gap-2'>
            <Input.DescriptionAndValidation>
              <Input.TextInput
                type={type}
                disabled={disabled}
                placeholder={'Latitude'}
                // TODO(burdon): Path.
                value={getValue(property, type) ?? ''}
                onChange={(event) => onValueChange(property, type, event.target.value)}
                onBlur={onBlur}
              />
              <Input.Validation>{errorMessage}</Input.Validation>
            </Input.DescriptionAndValidation>
            <Input.DescriptionAndValidation>
              <Input.TextInput
                type={type}
                disabled={disabled}
                placeholder={'Longitude'}
                // TODO(burdon): Path.
                value={getValue(property, type) ?? ''}
                onChange={(event) => onValueChange(property, type, event.target.value)}
                onBlur={onBlur}
              />
              <Input.Validation>{errorMessage}</Input.Validation>
            </Input.DescriptionAndValidation>
          </div>
        </Input.Root>
      );
    }
  }

  //
  // Read-only fallback.
  //

  return (
    <Input.Root validationValence={errorValence}>
      <Input.Label>{label}</Input.Label>
      <div>{String(getValue(property, type))}</div>
    </Input.Root>
  );
};
