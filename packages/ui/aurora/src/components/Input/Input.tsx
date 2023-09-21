//
// Copyright 2023 DXOS.org
//

import { Check, IconWeight, Minus } from '@phosphor-icons/react';
import {
  Root as CheckboxPrimitive,
  CheckboxProps as CheckboxPrimitiveProps,
  Indicator as CheckboxIndicatorPrimitive,
} from '@radix-ui/react-checkbox';
import {
  Root as SwitchPrimitive,
  Thumb as SwitchThumbPrimitive,
  SwitchProps as SwitchPrimitiveProps,
} from '@radix-ui/react-switch';
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
  Description as DescriptionPrimitive,
  DescriptionAndValidation as DescriptionAndValidationPrimitive,
  DescriptionAndValidationProps as DescriptionAndValidationPrimitiveProps,
  DescriptionProps as DescriptionPrimitiveProps,
  Label as LabelPrimitive,
  LabelProps as LabelPrimitiveProps,
  Validation as ValidationPrimitive,
  ValidationProps as ValidationPrimitiveProps,
} from '@dxos/react-input';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type InputVariant = 'default' | 'subdued';

type InputSharedProps = Partial<{ density: Density; elevation: Elevation; variant: InputVariant }>;

type LabelProps = ThemedClassName<LabelPrimitiveProps> & { srOnly?: boolean };

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ srOnly, classNames, children, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <LabelPrimitive {...props} className={tx('input.label', 'input__label', { srOnly }, classNames)} ref={forwardedRef}>
      {children}
    </LabelPrimitive>
  );
});

type DescriptionProps = ThemedClassName<DescriptionPrimitiveProps> & { srOnly?: boolean };

const Description = forwardRef<HTMLSpanElement, DescriptionProps>(
  ({ srOnly, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DescriptionPrimitive
        {...props}
        className={tx('input.description', 'input__description', { srOnly }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </DescriptionPrimitive>
    );
  },
);

type ValidationProps = ThemedClassName<ValidationPrimitiveProps> & { srOnly?: boolean };

const Validation = forwardRef<HTMLSpanElement, InputScopedProps<ValidationProps>>(
  ({ __inputScope, srOnly, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);
    return (
      <ValidationPrimitive
        {...props}
        className={tx(
          'input.validation',
          `input__validation-message input__validation-message--${validationValence}`,
          { srOnly, validationValence },
          classNames,
        )}
        ref={forwardedRef}
      >
        {children}
      </ValidationPrimitive>
    );
  },
);

type DescriptionAndValidationProps = ThemedClassName<DescriptionAndValidationPrimitiveProps> & { srOnly?: boolean };

const DescriptionAndValidation = forwardRef<HTMLParagraphElement, DescriptionAndValidationProps>(
  ({ srOnly, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DescriptionAndValidationPrimitive
        {...props}
        className={tx('input.descriptionAndValidation', 'input__description-and-validation', { srOnly }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </DescriptionAndValidationPrimitive>
    );
  },
);

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

// TODO(burdon): Input width is overridden by default 'is-full' style.
// TODO(burdon): Implement inline icon within button: e.g., https://www.radix-ui.com/themes/playground#text-field

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

// TODO(burdon): Provide inline checkbox label left/right.

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
          className: tx('input.checkbox', 'input--checkbox', { size }, 'shrink-0', classNames),
        }}
        ref={forwardedRef}
      >
        <CheckboxIndicatorPrimitive asChild>
          <Icon
            {...(checked && {
              weight,
              className: tx('input.checkboxIndicator', 'input--checkbox__indicator', { size }),
            })}
          />
        </CheckboxIndicatorPrimitive>
      </CheckboxPrimitive>
    );
  },
);

type SwitchProps = ThemedClassName<Omit<SwitchPrimitiveProps, 'children'>> & { size?: Size };

const Switch: ForwardRefExoticComponent<SwitchProps> = forwardRef<HTMLButtonElement, InputScopedProps<SwitchProps>>(
  (
    {
      __inputScope,
      checked: propsChecked,
      defaultChecked: propsDefaultChecked,
      onCheckedChange: propsOnCheckedChange,
      size,
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
    // const { tx } = useThemeContext();
    return (
      <SwitchPrimitive
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
          // className: tx('input.checkbox', 'input--checkbox', { size }, 'shrink-0', classNames),
          className:
            'w-[56px] h-[32px] bg-transparent rounded-full px-[4px] border-2 border-neutral-500 relative data-[state=checked]:border-primary-500 data-[state=checked]:bg-primary-500 outline-none cursor-default',
        }}
        ref={forwardedRef}
      >
        {/* TODO(wittjosiah): Embed icons/text for on/off states.
             e.g., https://codepen.io/alvarotrigo/pen/oNoJePo (#13) */}
        <SwitchThumbPrimitive className='block w-[22px] h-[22px] bg-neutral-500 rounded-full border-neutral-100 transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-white'></SwitchThumbPrimitive>
      </SwitchPrimitive>
    );
  },
);

export const Input = {
  Root: InputRoot,
  PinInput,
  TextInput,
  TextArea,
  Checkbox,
  Switch,
  Label,
  Description,
  Validation,
  DescriptionAndValidation,
};

export type {
  InputVariant,
  InputRootProps,
  PinInputProps,
  TextInputProps,
  TextAreaProps,
  CheckboxProps,
  SwitchProps,
  LabelProps,
  DescriptionProps,
  ValidationProps,
  DescriptionAndValidationProps,
};
