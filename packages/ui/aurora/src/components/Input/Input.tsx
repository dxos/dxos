//
// Copyright 2023 DXOS.org
//
import React, { forwardRef, useCallback } from 'react';

import { Density, Elevation, ClassNameValue } from '@dxos/aurora-types';
import {
  InputRoot,
  InputRootProps,
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

type InputVariant = 'default' | 'subdued';

type InputSharedProps = Partial<{ density: Density; elevation: Elevation; variant: InputVariant }>;

type PinInputProps = InputSharedProps &
  Omit<PinInputPrimitiveProps, 'segmentClassName' | 'inputClassName'> & {
    segmentClassName?: ClassNameValue;
    inputClassName?: ClassNameValue;
  };

const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  (
    {
      density: propsDensity,
      elevation: propsElevation,
      segmentClassName: propsSegmentClassName,
      inputClassName,
      variant,
      ...props
    },
    forwardedRef
  ) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);

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
            elevation,
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
        ref={forwardedRef}
      />
    );
  }
);

type TextInputProps = InputSharedProps & ThemedClassName<TextInputPrimitiveProps>;

const TextInput = forwardRef<HTMLInputElement, InputScopedProps<TextInputProps>>(
  ({ __inputScope, className, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
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
            elevation,
            validationValence
          },
          className
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  }
);

type TextAreaProps = InputSharedProps & ThemedClassName<TextAreaPrimitiveProps>;

const TextArea = forwardRef<HTMLTextAreaElement, InputScopedProps<TextAreaProps>>(
  ({ __inputScope, className, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
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
            elevation,
            validationValence
          },
          className
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  }
);

export { InputRoot, PinInput, TextInput, TextArea };

export type { InputVariant, InputRootProps, PinInputProps, TextInputProps, TextAreaProps };
