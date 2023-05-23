//
// Copyright 2023 DXOS.org
//
import { Check, IconWeight, Minus } from '@phosphor-icons/react';
import {
  Root as CheckboxPrimitive,
  CheckboxProps as CheckboxPrimitiveProps,
  Indicator as CheckboxIndicatorPrimitive,
} from '@radix-ui/react-checkbox';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { forwardRef, ForwardRefExoticComponent, Fragment, useCallback } from 'react';

import { Density, Elevation, ClassNameValue, Size } from '@dxos/aurora-types';
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
  InputScopedProps,
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
    forwardedRef,
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
            validationValence,
          },
          propsSegmentClassName,
        ),
      [tx, props.disabled, elevation, propsElevation, density],
    );
    return (
      <PinInputPrimitive
        {...{
          ...props,
          segmentClassName,
          ...(props.autoFocus && !hasIosKeyboard && { autoFocus: true }),
        }}
        inputClassName={tx('input.inputWithSegments', 'input input--pin', { disabled: props.disabled }, inputClassName)}
        ref={forwardedRef}
      />
    );
  },
);

type TextInputProps = InputSharedProps & ThemedClassName<TextInputPrimitiveProps>;

const TextInput = forwardRef<HTMLInputElement, InputScopedProps<TextInputProps>>(
  ({ __inputScope, classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
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
            validationValence,
          },
          classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  },
);

type TextAreaProps = InputSharedProps & ThemedClassName<TextAreaPrimitiveProps>;

const TextArea = forwardRef<HTMLTextAreaElement, InputScopedProps<TextAreaProps>>(
  ({ __inputScope, classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
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
            validationValence,
          },
          classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  },
);

type CheckboxProps = ThemedClassName<Omit<CheckboxPrimitiveProps, 'children'>> & { size?: Size; weight?: IconWeight };

const Checkbox: ForwardRefExoticComponent<CheckboxProps> = forwardRef<
  HTMLButtonElement,
  InputScopedProps<CheckboxProps>
>(
  (
    {
      __inputScope,
      checked: propsChecked,
      defaultChecked: propsDefaultChecked,
      onCheckedChange: propsOnCheckedChange,
      size,
      weight = 'bold',
      classNames,
      ...props
    },
    forwardedRef,
  ) => {
    const [checked, onCheckedChange] = useControllableState({
      prop: propsChecked,
      defaultProp: propsDefaultChecked,
      onChange: propsOnCheckedChange,
    });
    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);
    const { tx } = useThemeContext();
    const Icon = checked === 'indeterminate' ? Minus : checked ? Check : Fragment;
    return (
      <CheckboxPrimitive
        {...{
          ...props,
          checked,
          onCheckedChange,
          id,
          'aria-describedby': descriptionId,
          ...(validationValence === 'error' && {
            'aria-invalid': 'true' as const,
            'aria-errormessage': errorMessageId,
          }),
          className: tx('input.checkbox', 'input--checkbox', { size }, classNames),
        }}
        ref={forwardedRef}
      >
        <CheckboxIndicatorPrimitive asChild>
          <Icon weight={weight} className={tx('input.checkboxIndicator', 'input--checkbox__indicator', { size })} />
        </CheckboxIndicatorPrimitive>
      </CheckboxPrimitive>
    );
  },
);

export { InputRoot, PinInput, TextInput, TextArea, Checkbox };

export type { InputVariant, InputRootProps, PinInputProps, TextInputProps, TextAreaProps, CheckboxProps };
