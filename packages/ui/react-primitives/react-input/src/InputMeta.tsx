//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { INPUT_NAME, useInputContext } from './InputContext';

type LabelProps = ComponentPropsWithRef<typeof ark.label> & { asChild?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ asChild, children, ...props }: LabelProps, forwardedRef) => {
  const { id } = useInputContext(INPUT_NAME);
  return (
    <ark.label asChild={asChild} {...props} htmlFor={id} ref={forwardedRef}>
      {children}
    </ark.label>
  );
});

type DescriptionProps = Omit<ComponentPropsWithRef<typeof ark.span>, 'id'> & { asChild?: boolean };

const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ asChild, children, ...props }: DescriptionProps, forwardedRef) => {
    const { descriptionId, validationValence } = useInputContext(INPUT_NAME);
    return (
      <ark.span
        asChild={asChild}
        {...props}
        {...(validationValence === 'error' && { id: descriptionId })}
        ref={forwardedRef}
      >
        {children}
      </ark.span>
    );
  },
);

type ErrorMessageProps = Omit<ComponentPropsWithRef<typeof ark.span>, 'id'> & { asChild?: boolean };

const ErrorMessage = forwardRef<HTMLSpanElement, ErrorMessageProps>(
  ({ asChild, children, ...props }: ErrorMessageProps, forwardedRef) => {
    const { errorMessageId } = useInputContext(INPUT_NAME);
    return (
      <ark.span asChild={asChild} {...props} id={errorMessageId} ref={forwardedRef}>
        {children}
      </ark.span>
    );
  },
);

type ValidationProps = Omit<ComponentPropsWithRef<typeof ark.span>, 'id'> & { asChild?: boolean };

const Validation = forwardRef<HTMLSpanElement, ValidationProps>((props: ValidationProps, forwardedRef) => {
  const { asChild, children, ...otherProps } = props;
  const { validationValence } = useInputContext(INPUT_NAME);
  if (validationValence === 'error') {
    return <ErrorMessage {...props} ref={forwardedRef} />;
  } else {
    return (
      <ark.span asChild={asChild} {...otherProps} ref={forwardedRef}>
        {children}
      </ark.span>
    );
  }
});

type DescriptionAndValidationProps = ComponentPropsWithRef<typeof ark.p> & { asChild?: boolean };

const DescriptionAndValidation = forwardRef<HTMLParagraphElement, DescriptionAndValidationProps>(
  ({ asChild, children, ...props }: DescriptionAndValidationProps, forwardedRef) => {
    const { descriptionId, validationValence } = useInputContext(INPUT_NAME);
    return (
      <ark.p
        asChild={asChild}
        {...props}
        {...(validationValence !== 'error' && { id: descriptionId })}
        ref={forwardedRef}
      >
        {children}
      </ark.p>
    );
  },
);

export { Description, DescriptionAndValidation, ErrorMessage, Label, Validation };

export type { DescriptionAndValidationProps, DescriptionProps, ErrorMessageProps, LabelProps, ValidationProps };
