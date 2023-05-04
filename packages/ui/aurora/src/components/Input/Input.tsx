//
// Copyright 2023 DXOS.org
//
import React, { useCallback } from 'react';

import { Density, Elevation, ClassNameValue } from '@dxos/aurora-types';
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
  TextInput as TextInputPrimitive,
  TextInputProps as TextInputPrimitiveProps,
  TextArea as TextAreaPrimitive,
  TextAreaProps as TextAreaPrimitiveProps,
  useInputContext,
  INPUT_NAME,
  InputScopedProps
} from '@dxos/react-input';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type RootProps = InputRootProps;

const Root = (props: RootProps) => {
  return <InputRoot {...props} />;
};

type LabelProps = ThemedClassName<LabelPrimitiveProps> & { srOnly?: boolean };

const Label = ({ srOnly, className, children, ...props }: LabelProps) => {
  const { tx } = useThemeContext();
  return (
    <LabelPrimitive {...props} className={tx('input.label', 'input__label', { srOnly }, className)}>
      {children}
    </LabelPrimitive>
  );
};

type DescriptionProps = ThemedClassName<DescriptionPrimitiveProps> & { srOnly?: boolean };

const Description = ({ srOnly, className, children, ...props }: DescriptionProps) => {
  const { tx } = useThemeContext();
  return (
    <DescriptionPrimitive {...props} className={tx('input.description', 'input__description', { srOnly }, className)}>
      {children}
    </DescriptionPrimitive>
  );
};

type ValidationProps = ThemedClassName<ValidationPrimitiveProps> & { srOnly?: boolean };

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

type DescriptionAndValidationProps = ThemedClassName<DescriptionAndValidationPrimitiveProps> & { srOnly?: boolean };

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
  Omit<PinInputPrimitiveProps, 'segmentClassName' | 'inputClassName'> & {
    segmentClassName?: ClassNameValue;
    inputClassName?: ClassNameValue;
  };

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
          elevation: propsElevation ?? elevation,
          validationValence
        },
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

type TextInputProps = InputSharedProps & ThemedClassName<TextInputPrimitiveProps>;

const TextInput = ({
  __inputScope,
  className,
  density: propsDensity,
  elevation: propsElevation,
  variant,
  ...props
}: InputScopedProps<TextInputProps>) => {
  const { hasIosKeyboard } = useThemeContext();
  const { tx } = useThemeContext();
  const density = useDensityContext(propsDensity);
  const { elevation } = useElevationContext();
  const { validationValence } = useInputContext(INPUT_NAME, __inputScope);

  return (
    <TextInputPrimitive
      {...props}
      className={tx(
        'input.input',
        'input',
        {
          variant,
          disabled: props.disabled,
          density,
          elevation: propsElevation ?? elevation,
          validationValence
        },
        className
      )}
      {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
    />
  );
};

type TextAreaProps = InputSharedProps & ThemedClassName<TextAreaPrimitiveProps>;

const TextArea = ({
  __inputScope,
  className,
  density: propsDensity,
  elevation: propsElevation,
  variant,
  ...props
}: InputScopedProps<TextAreaProps>) => {
  const { hasIosKeyboard } = useThemeContext();
  const { tx } = useThemeContext();
  const density = useDensityContext(propsDensity);
  const { elevation } = useElevationContext();
  const { validationValence } = useInputContext(INPUT_NAME, __inputScope);

  return (
    <TextAreaPrimitive
      {...props}
      className={tx(
        'input.input',
        'input--text-area',
        {
          variant,
          disabled: props.disabled,
          density,
          elevation: propsElevation ?? elevation,
          validationValence
        },
        className
      )}
      {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
    />
  );
};

export {
  Root,
  Root as InputRoot,
  Label,
  Description,
  Validation,
  DescriptionAndValidation,
  PinInput,
  TextInput,
  TextArea
};

export type {
  RootProps,
  RootProps as InputRootProps,
  LabelProps,
  DescriptionProps,
  ValidationProps,
  DescriptionAndValidationProps,
  PinInputProps,
  TextInputProps,
  TextAreaProps
};
