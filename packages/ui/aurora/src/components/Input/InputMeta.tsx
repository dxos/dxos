//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import {
  Description as DescriptionPrimitive,
  DescriptionAndValidation as DescriptionAndValidationPrimitive,
  DescriptionAndValidationProps as DescriptionAndValidationPrimitiveProps,
  DescriptionProps as DescriptionPrimitiveProps,
  INPUT_NAME,
  InputScopedProps,
  Label as LabelPrimitive,
  LabelProps as LabelPrimitiveProps,
  useInputContext,
  Validation as ValidationPrimitive,
  ValidationProps as ValidationPrimitiveProps
} from '@dxos/react-input';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type LabelProps = ThemedClassName<LabelPrimitiveProps> & { srOnly?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ srOnly, className, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <LabelPrimitive {...props} className={tx('input.label', 'input__label', { srOnly }, className)} ref={forwardedRef}>
      {children}
    </LabelPrimitive>
  );
});

type DescriptionProps = ThemedClassName<DescriptionPrimitiveProps> & { srOnly?: boolean };

const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ srOnly, className, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DescriptionPrimitive
        {...props}
        className={tx('input.description', 'input__description', { srOnly }, className)}
        ref={forwardedRef}
      >
        {children}
      </DescriptionPrimitive>
    );
  }
);

type ValidationProps = ThemedClassName<ValidationPrimitiveProps> & { srOnly?: boolean };

const Validation = forwardRef<HTMLSpanElement, InputScopedProps<ValidationProps>>(
  ({ __inputScope, srOnly, className, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);
    return (
      <ValidationPrimitive
        {...props}
        className={tx(
          'input.validation',
          `input__validation-message input__validation-message--${validationValence}`,
          { srOnly, validationValence },
          className
        )}
        ref={forwardedRef}
      >
        {children}
      </ValidationPrimitive>
    );
  }
);

type DescriptionAndValidationProps = ThemedClassName<DescriptionAndValidationPrimitiveProps> & { srOnly?: boolean };

const DescriptionAndValidation = forwardRef<HTMLParagraphElement, DescriptionAndValidationProps>(
  ({ srOnly, className, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DescriptionAndValidationPrimitive
        {...props}
        className={tx('input.descriptionAndValidation', 'input__description-and-validation', { srOnly }, className)}
        ref={forwardedRef}
      >
        {children}
      </DescriptionAndValidationPrimitive>
    );
  }
);

export { Label, Description, Validation, DescriptionAndValidation };

export type { LabelProps, DescriptionProps, ValidationProps, DescriptionAndValidationProps };
