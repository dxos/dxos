//
// Copyright 2022 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import { Input as NaturalInput, type TextAreaProps } from '@dxos/react-ui';

import { type InputProps as AppkitInputProps } from './InputProps';

export type InputProps = AppkitInputProps;

/**
 * @deprecated use Input subcomponents from @dxos/react-ui
 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      label,
      labelVisuallyHidden,
      description,
      descriptionVisuallyHidden,
      value,
      defaultValue,
      onChange,
      disabled,
      placeholder,
      size,
      length = 6,
      validationMessage,
      validationValence,
      variant = 'default',
      elevation,
      density,
      slots = {},
    }: InputProps,
    forwardedRef,
  ) => {
    const { id, ...inputSlot } = slots.input ?? {};

    const bareInputBaseProps = {
      ...inputSlot,
      ...(slots.input?.required && { required: true }),
      disabled,
      placeholder,
      value,
      defaultValue,
      onChange,
      variant,
      elevation,
      density,
    };

    const bareInput =
      size === 'pin' ? (
        <NaturalInput.PinInput
          {...bareInputBaseProps}
          length={length}
          ref={forwardedRef as ForwardedRef<HTMLInputElement>}
        />
      ) : size === 'textarea' ? (
        <NaturalInput.TextArea
          {...(bareInputBaseProps as TextAreaProps)}
          ref={forwardedRef as ForwardedRef<HTMLTextAreaElement>}
        />
      ) : (
        <NaturalInput.TextInput {...bareInputBaseProps} ref={forwardedRef as ForwardedRef<HTMLInputElement>} />
      );

    return (
      <div role='none' className={slots.root?.className}>
        <NaturalInput.Root {...{ validationValence, id }}>
          <NaturalInput.Label {...slots?.label} srOnly={labelVisuallyHidden}>
            {label}
          </NaturalInput.Label>
          {bareInput}
          {(description || validationMessage) && (
            <NaturalInput.DescriptionAndValidation classNames={slots.description?.className}>
              {validationMessage && (
                <NaturalInput.Validation classNames={slots.validation?.className}>
                  {validationMessage}{' '}
                </NaturalInput.Validation>
              )}
              <NaturalInput.Description srOnly={descriptionVisuallyHidden} classNames={slots.description?.className}>
                {description}
              </NaturalInput.Description>
            </NaturalInput.DescriptionAndValidation>
          )}
        </NaturalInput.Root>
      </div>
    );
  },
);
