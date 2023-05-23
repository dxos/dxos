//
// Copyright 2023 DXOS.org
//

import { ComponentFragment, ComponentFunction, Density, Elevation, MessageValence, Size } from '@dxos/aurora-types';

import { mx } from '../../util';
import {
  defaultCoarse,
  defaultDisabled,
  defaultFine,
  defaultPlaceholder,
  defaultFocus,
  defaultHover,
  osFocus,
  osHover,
  subduedFocus,
  fineBlockSize,
  coarseBlockSize,
  staticFocus,
  defaultDescription,
  valenceColorText,
  contentElevation,
  getSize,
  computeSize,
  sizeValue,
} from '../fragments';

export type InputStyleProps = Partial<{
  variant: 'default' | 'subdued' | 'static';
  disabled: boolean;
  focused: boolean;
  density: Density;
  elevation: Elevation;
  validationValence: MessageValence;
  size: Size;
}>;

export type InputMetaStyleProps = Partial<{
  srOnly: boolean;
  validationValence: MessageValence;
}>;

export const neutralInputValence = '';
export const successInputValence = 'shadow-success-500/50 dark:shadow-success-600/50';
export const infoInputValence = 'shadow-info-500/50 dark:shadow-info-600/50';
export const warningInputValence = 'shadow-warning-500/50 dark:shadow-warning-600/50';
export const errorInputValence = 'shadow-error-500/50 dark:shadow-error-600/50';

export const inputValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return successInputValence;
    case 'info':
      return infoInputValence;
    case 'warning':
      return warningInputValence;
    case 'error':
      return errorInputValence;
    default:
      return null;
  }
};

const sharedSubduedInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full bg-transparent text-current',
  props.density === 'fine' ? fineBlockSize : coarseBlockSize,
  defaultPlaceholder,
  subduedFocus,
  props.disabled && defaultDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full text-neutral-900 dark:text-white',
  defaultPlaceholder,
  props.density === 'fine' ? defaultFine : defaultCoarse,
  props.disabled && defaultDisabled,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  defaultPlaceholder,
  'text-base rounded bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
  inputValence(props.validationValence),
  props.disabled && defaultDisabled,
  props.focused && staticFocus,
];

export const inputAppInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...etc)
    : props.variant === 'static'
    ? mx(...sharedStaticInputStyles(props), !props.disabled && contentElevation(props), ...etc)
    : mx(
        'rounded text-base bg-white/50 focus-visible:bg-white/50 dark:bg-neutral-700/50 dark:focus-visible:bg-neutral-700/50 border-transparent',
        !props.disabled && defaultFocus,
        !props.disabled && defaultHover,
        inputValence(props.validationValence) || neutralInputValence,
        !props.disabled && contentElevation(props),
        ...sharedDefaultInputStyles(props),
        ...etc,
      );

export const inputOsInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...etc)
    : props.variant === 'static'
    ? mx(...sharedStaticInputStyles(props), ...etc)
    : mx(
        'rounded-sm text-sm bg-white/50 dark:bg-neutral-750/50',
        !props.disabled && osFocus,
        !props.disabled && osHover,
        inputValence(props.validationValence) ||
          'border-transparent focus-visible:border-transparent dark:focus-visible:border-transparent',
        ...sharedDefaultInputStyles(props),
        ...etc,
      );

export const inputAppCheckbox: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSize(size),
    'flex items-center justify-center rounded text-white',
    'radix-state-checked:bg-primary-600 radix-state-unchecked:bg-neutral-200 dark:radix-state-unchecked:bg-neutral-700',
    defaultFocus,
    ...etc,
  );

export const inputOsCheckbox: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSize(size),
    'flex items-center justify-center rounded text-white',
    'radix-state-checked:bg-primary-600 radix-state-unchecked:bg-neutral-200 dark:radix-state-unchecked:bg-neutral-700',
    osFocus,
    ...etc,
  );

export const inputCheckboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(getSize(computeSize(sizeValue(size) * 0.7, 4)), ...etc);

export const inputWithSegmentsInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx('font-mono selection:bg-transparent mli-auto', props.disabled && 'cursor-not-allowed', ...etc);

export const inputLabel: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('block pbe-1 text-sm font-medium text-neutral-900 dark:text-neutral-100', props.srOnly && 'sr-only', ...etc);

export const inputDescription: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(defaultDescription, props.srOnly && 'sr-only', ...etc);

export const inputDescriptionAndValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(props.srOnly && 'sr-only', ...etc);

export const inputValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(defaultDescription, props.srOnly ? 'sr-only' : valenceColorText(props.validationValence), ...etc);

export const inputTheme = {
  input: inputAppInput,
  inputWithSegments: inputWithSegmentsInput,
  checkbox: inputAppCheckbox,
  checkboxIndicator: inputCheckboxIndicator,
  label: inputLabel,
  description: inputDescription,
  validation: inputValidation,
  descriptionAndValidation: inputDescriptionAndValidation,
};

export const inputOsTheme = {
  ...inputTheme,
  input: inputOsInput,
  checkbox: inputOsCheckbox,
};
