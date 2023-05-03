//
// Copyright 2023 DXOS.org
//
import { Slot } from '@radix-ui/react-slot';
import React, { useCallback } from 'react';

import { contentElevation, Density, Elevation } from '@dxos/aurora-theme';
import { MessageValence } from '@dxos/aurora-types';
import {
  InputRoot,
  InputRootProps,
  Label as LabelPrimitive,
  LabelProps as LabelPrimitiveProps,
  Description as DescriptionPrimitive,
  DescriptionProps as DescriptionPrimitiveProps,
  ErrorMessage as ErrorMessagePrimitive,
  ErrorMessageProps as ErrorMessagePrimitiveProps,
  PinInput as PinInputPrimitive,
  PinInputProps as PinInputPrimitiveProps
} from '@dxos/react-input';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';

type RootProps = InputRootProps;

const Root = (props: RootProps) => {
  return <InputRoot {...props} />;
};

type LabelProps = LabelPrimitiveProps & { srOnly?: boolean };

const Label = ({ srOnly, className, children, ...props }: LabelProps) => {
  const { tx } = useThemeContext();
  return (
    <LabelPrimitive {...props} className={tx('input.label', 'label', { srOnly }, className)}>
      {children}
    </LabelPrimitive>
  );
};

type DescriptionProps = DescriptionPrimitiveProps & { srOnly?: boolean };

const Description = ({ srOnly, className, children, ...props }: DescriptionProps) => {
  const { tx } = useThemeContext();
  return (
    <DescriptionPrimitive {...props} className={tx('input.description', 'description', { srOnly }, className)}>
      {children}
    </DescriptionPrimitive>
  );
};

type ErrorMessageProps = ErrorMessagePrimitiveProps & { srOnly?: boolean };

const ErrorMessage = ({ srOnly, className, children, ...props }: ErrorMessageProps) => {
  const { tx } = useThemeContext();
  return (
    <ErrorMessagePrimitive
      {...props}
      className={tx(
        'input.validationMessage',
        'validation-message validation-message--error',
        { srOnly, validationValence: 'error' },
        className
      )}
    >
      {children}
    </ErrorMessagePrimitive>
  );
};

type ValidationMessageProps = ErrorMessagePrimitiveProps & { srOnly?: boolean; validationValence?: MessageValence };

const ValidationMessage = (props: ValidationMessageProps) => {
  const { tx } = useThemeContext();
  const { srOnly, validationValence, className, asChild, children, ...otherProps } = props;
  if (validationValence === 'error') {
    return <ErrorMessage {...props} />;
  } else {
    const Root = asChild ? Slot : 'span';
    return (
      <Root
        {...otherProps}
        className={tx(
          'input.validationMessage',
          `validation-message validation-message--${validationValence}`,
          { srOnly, validationValence },
          className
        )}
      >
        {children}
      </Root>
    );
  }
};

type InputVariant = 'default' | 'subdued';

type InputSharedProps = Partial<{ density: Density; elevation: Elevation; variant: InputVariant }>;

type PinInputProps = InputSharedProps &
  Omit<PinInputPrimitiveProps, 'segmentClassName'> & { segmentClassName?: string };

const PinInput = ({
  density: propsDensity,
  elevation: propsElevation,
  segmentClassName: propsSegmentClassName,
  inputClassName,
  variant,
  ...props
}: PinInputProps) => {
  const { hasIosKeyboard } = useThemeContext();
  const { tx } = useThemeContext();
  const density = useDensityContext(propsDensity);
  const { elevation } = useElevationContext();

  const segmentClassName = useCallback(
    ({ focused, validationValence }: Parameters<Exclude<PinInputPrimitiveProps['segmentClassName'], undefined>>[0]) =>
      tx(
        'input.input',
        'input--pin-segment',
        {
          variant: 'static',
          focused,
          disabled: props.disabled,
          density,
          validationValence
        },
        !props.disabled && variant !== 'subdued' && contentElevation({ elevation: propsElevation ?? elevation }),
        propsSegmentClassName
      ),
    [tx, props.disabled, elevation, propsElevation, density]
  );
  return (
    <PinInputPrimitive
      {...{
        ...props,
        segmentClassName,
        ...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })
      }}
      inputClassName={tx('input.inputWithSegments', 'input input--pin', { disabled: props.disabled }, inputClassName)}
    />
  );
};

export { Root, Root as InputRoot, Label, Description, ErrorMessage, ValidationMessage, PinInput };

export type {
  RootProps,
  RootProps as InputRootProps,
  LabelProps,
  DescriptionProps,
  ErrorMessageProps,
  ValidationMessageProps,
  PinInputProps
};
