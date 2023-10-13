//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, type InputScopedProps, useInputContext } from './Root';

type LabelProps = ComponentPropsWithRef<typeof Primitive.label> & { asChild?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<LabelProps>, forwardedRef) => {
    const { id } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.label;
    return (
      <Root {...props} htmlFor={id} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type DescriptionProps = Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'> & { asChild?: boolean };

const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<DescriptionProps>, forwardedRef) => {
    const { descriptionId, validationValence } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.span;
    return (
      <Root {...props} {...(validationValence === 'error' && { id: descriptionId })} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type ErrorMessageProps = Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'> & { asChild?: boolean };

const ErrorMessage = forwardRef<HTMLSpanElement, ErrorMessageProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<ErrorMessageProps>, forwardedRef) => {
    const { errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.span;
    return (
      <Root {...props} id={errorMessageId} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

type ValidationProps = Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'> & { asChild?: boolean };

const Validation = forwardRef<HTMLSpanElement, ValidationProps>(
  (props: InputScopedProps<ValidationProps>, forwardedRef) => {
    const { __inputScope, asChild, children, ...otherProps } = props;
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);
    if (validationValence === 'error') {
      return <ErrorMessage {...props} ref={forwardedRef} />;
    } else {
      const Root = asChild ? Slot : Primitive.span;
      return (
        <Root {...otherProps} ref={forwardedRef}>
          {children}
        </Root>
      );
    }
  },
);

type DescriptionAndValidationProps = ComponentPropsWithRef<typeof Primitive.p> & { asChild?: boolean };

const DescriptionAndValidation = forwardRef<HTMLParagraphElement, DescriptionAndValidationProps>(
  ({ __inputScope, asChild, children, ...props }: InputScopedProps<DescriptionAndValidationProps>, forwardedRef) => {
    const { descriptionId, validationValence } = useInputContext(INPUT_NAME, __inputScope);
    const Root = asChild ? Slot : Primitive.p;
    return (
      <Root {...props} {...(validationValence !== 'error' && { id: descriptionId })} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

export { Label, Validation, Description, DescriptionAndValidation, ErrorMessage };

export type { LabelProps, ValidationProps, DescriptionProps, DescriptionAndValidationProps, ErrorMessageProps };
