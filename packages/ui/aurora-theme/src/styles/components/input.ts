//
// Copyright 2023 DXOS.org
//

import { ComponentFragment, ComponentFunction, Density, Elevation, MessageValence, Size } from '@dxos/aurora-types';

import { mx } from '../../util';
import {
  coarseDimensions,
  staticDisabled,
  fineDimensions,
  placeholderText,
  focusRing,
  hoverColors,
  subduedFocus,
  fineBlockSize,
  coarseBlockSize,
  staticFocusRing,
  descriptionText,
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

// TODO(burdon): Remove is-full as default (prevents setting specific width).
// TODO(burdon): Factor out color defs?
const sharedSubduedInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full bg-transparent text-current',
  props.density === 'fine' ? fineBlockSize : coarseBlockSize,
  placeholderText,
  subduedFocus,
  props.disabled && staticDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full text-neutral-900 dark:text-white',
  placeholderText,
  props.density === 'fine' ? fineDimensions : coarseDimensions,
  props.disabled && staticDisabled,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  placeholderText,
  'text-base rounded bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
  inputValence(props.validationValence),
  props.disabled && staticDisabled,
  props.focused && staticFocusRing,
];

export const inputInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...etc)
    : props.variant === 'static'
    ? mx(...sharedStaticInputStyles(props), !props.disabled && contentElevation(props), ...etc)
    : mx(
        'rounded text-base bg-white/50 focus-visible:bg-white/50 dark:bg-neutral-700/50 dark:focus-visible:bg-neutral-700/50 border-transparent focus:border-transparent',
        !props.disabled && focusRing,
        !props.disabled && hoverColors,
        inputValence(props.validationValence) || neutralInputValence,
        !props.disabled && contentElevation(props),
        ...sharedDefaultInputStyles(props),
        ...etc,
      );

export const inputCheckbox: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSize(size),
    'shrink-0 flex items-center justify-center rounded text-white',
    'radix-state-checked:bg-primary-600 radix-state-unchecked:bg-neutral-200 dark:radix-state-unchecked:bg-neutral-700',
    focusRing,
    ...etc,
  );

export const inputCheckboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(getSize(computeSize(sizeValue(size) * 0.7, 4)), ...etc);

export const inputWithSegmentsInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx('font-mono selection:bg-transparent mli-auto', props.disabled && 'cursor-not-allowed', ...etc);

export const inputLabel: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('block text-sm font-medium text-neutral-900 dark:text-neutral-100', props.srOnly && 'sr-only', ...etc);

export const inputDescription: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(descriptionText, props.srOnly && 'sr-only', ...etc);

export const inputDescriptionAndValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('leading-none mlb-1', props.srOnly && 'sr-only', ...etc);

export const inputValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(descriptionText, props.srOnly ? 'sr-only' : valenceColorText(props.validationValence), ...etc);

export const inputTheme = {
  input: inputInput,
  inputWithSegments: inputWithSegmentsInput,
  checkbox: inputCheckbox,
  checkboxIndicator: inputCheckboxIndicator,
  label: inputLabel,
  description: inputDescription,
  validation: inputValidation,
  descriptionAndValidation: inputDescriptionAndValidation,
};
