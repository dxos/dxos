//
// Copyright 2023 DXOS.org
//

import { type IconWeight } from '@phosphor-icons/react';
import { Root as CheckboxPrimitive, type CheckboxProps as CheckboxPrimitiveProps } from '@radix-ui/react-checkbox';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type ComponentPropsWithRef, forwardRef, type ForwardRefExoticComponent, useCallback } from 'react';

import {
  InputRoot,
  type InputRootProps,
  PinInput as PinInputPrimitive,
  type PinInputProps as PinInputPrimitiveProps,
  TextInput as TextInputPrimitive,
  type TextInputProps as TextInputPrimitiveProps,
  TextArea as TextAreaPrimitive,
  type TextAreaProps as TextAreaPrimitiveProps,
  useInputContext,
  INPUT_NAME,
  type InputScopedProps,
  Description as DescriptionPrimitive,
  DescriptionAndValidation as DescriptionAndValidationPrimitive,
  type DescriptionAndValidationProps as DescriptionAndValidationPrimitiveProps,
  type DescriptionProps as DescriptionPrimitiveProps,
  Label as LabelPrimitive,
  type LabelProps as LabelPrimitiveProps,
  Validation as ValidationPrimitive,
  type ValidationProps as ValidationPrimitiveProps,
} from '@dxos/react-input';
import { type Density, type Elevation, type ClassNameValue, type Size } from '@dxos/react-ui-types';

import { useDensityContext, useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Icon } from '../Icon';

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

// TODO(burdon): Implement inline icon within button: e.g., https://www.radix-ui.com/themes/playground#text-field

type TextInputProps = InputSharedProps & ThemedClassName<TextInputPrimitiveProps>;

const TextInput = forwardRef<HTMLInputElement, InputScopedProps<TextInputProps>>(
  ({ __inputScope, classNames, density: propsDensity, elevation: propsElevation, variant, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const themeContextValue = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
    const { validationValence } = useInputContext(INPUT_NAME, __inputScope);

    const { tx } = themeContextValue;

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
        <Icon
          icon={checked === 'indeterminate' ? 'ph--minus--regular' : 'ph--check--regular'}
          classNames={tx('input.checkboxIndicator', 'input--checkbox__indicator', { size, checked })}
        />
      </CheckboxPrimitive>
    );
  },
);

type SwitchProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'children' | 'onChange'> & { onCheckedChange?: (checked: boolean) => void }
>;

const Switch = forwardRef<HTMLInputElement, InputScopedProps<SwitchProps>>(
  ({ __inputScope, checked: propsChecked, classNames, ...props }, forwardedRef) => {
    const [checked, onCheckedChange] = useControllableState({
      prop: propsChecked,
      defaultProp: props.defaultChecked ?? false,
      onChange: props.onCheckedChange,
    });

    const { id, validationValence, descriptionId, errorMessageId } = useInputContext(INPUT_NAME, __inputScope);

    return (
      <input
        type='checkbox'
        className='ch-checkbox--switch ch-focus-ring'
        checked={checked}
        onChange={(event) => {
          onCheckedChange(event.target.checked);
        }}
        id={id}
        aria-describedby={descriptionId}
        {...props}
        {...(validationValence === 'error' && {
          'aria-invalid': 'true' as const,
          'aria-errormessage': errorMessageId,
        })}
        ref={forwardedRef}
      />
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
