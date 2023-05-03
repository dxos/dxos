//
// Copyright 2023 DXOS.org
//
import React, { useCallback } from 'react';

import { contentElevation, Density, Elevation } from '@dxos/aurora-theme';
import {
  InputRoot,
  InputRootProps,
  Label as LabelPrimitive,
  LabelProps as LabelPrimitiveProps,
  Description as DescriptionPrimitive,
  DescriptionProps as DescriptionPrimitiveProps,
  Validation as ValidationPrimitive,
  ValidationProps as ValidationPrimitiveProps,
  DescriptionAndValidation as DescriptionAndValidationPrimitive,
  DescriptionAndValidationProps as DescriptionAndValidationPrimitiveProps,
  PinInput as PinInputPrimitive,
  PinInputProps as PinInputPrimitiveProps,
  useInputContext,
  INPUT_NAME,
  InputScopedProps
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
    <LabelPrimitive {...props} className={tx('input.label', 'input__label', { srOnly }, className)}>
      {children}
    </LabelPrimitive>
  );
};

type DescriptionProps = DescriptionPrimitiveProps & { srOnly?: boolean };

const Description = ({ srOnly, className, children, ...props }: DescriptionProps) => {
  const { tx } = useThemeContext();
  return (
    <DescriptionPrimitive {...props} className={tx('input.description', 'input__description', { srOnly }, className)}>
      {children}
    </DescriptionPrimitive>
  );
};

type ValidationProps = ValidationPrimitiveProps & { srOnly?: boolean };

const Validation = ({ __inputScope, srOnly, className, children, ...props }: InputScopedProps<ValidationProps>) => {
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
    >
      {children}
    </ValidationPrimitive>
  );
};

type DescriptionAndValidationProps = DescriptionAndValidationPrimitiveProps & { srOnly?: boolean };

const DescriptionAndValidation = ({ srOnly, className, children, ...props }: DescriptionAndValidationProps) => {
  const { tx } = useThemeContext();
  return (
    <DescriptionAndValidationPrimitive
      {...props}
      className={tx('input.descriptionAndValidation', 'input__description-and-validation', { srOnly }, className)}
    >
      {children}
    </DescriptionAndValidationPrimitive>
  );
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

export { Root, Root as InputRoot, Label, Description, Validation, DescriptionAndValidation, PinInput };

export type {
  RootProps,
  RootProps as InputRootProps,
  LabelProps,
  DescriptionProps,
  ValidationProps,
  DescriptionAndValidationProps,
  PinInputProps
};
