//
// Copyright 2022 DXOS.org
//

import React, { ForwardedRef, forwardRef } from 'react';

import {
  Description,
  DescriptionAndValidation,
  InputRoot,
  Label,
  PinInput,
  TextArea,
  TextAreaProps,
  TextInput,
  Validation,
} from '@dxos/aurora';

import { InputProps as AppkitInputProps } from './InputProps';

export type InputProps = AppkitInputProps;

// TODO(burdon): Support input ref for programmatic focus.
// TODO(burdon): Allow placement of Icon at end of input (e.g., search, open/close button).
/**
 * @deprecated use Input subcomponents from @dxos/aurora
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
        <PinInput {...bareInputBaseProps} length={length} ref={forwardedRef as ForwardedRef<HTMLInputElement>} />
      ) : size === 'textarea' ? (
        <TextArea {...(bareInputBaseProps as TextAreaProps)} ref={forwardedRef as ForwardedRef<HTMLTextAreaElement>} />
      ) : (
        <TextInput {...bareInputBaseProps} ref={forwardedRef as ForwardedRef<HTMLInputElement>} />
      );

    return (
      <div role='none' className={slots.root?.className}>
        <InputRoot {...{ validationValence, id }}>
          <Label {...slots?.label} srOnly={labelVisuallyHidden}>
            {label}
          </Label>
          {bareInput}
          {(description || validationMessage) && (
            <DescriptionAndValidation classNames={slots.description?.className}>
              {validationMessage && (
                <Validation classNames={slots.validation?.className}>{validationMessage} </Validation>
              )}
              <Description srOnly={descriptionVisuallyHidden} classNames={slots.description?.className}>
                {description}
              </Description>
            </DescriptionAndValidation>
          )}
        </InputRoot>
      </div>
    );
  },
);
