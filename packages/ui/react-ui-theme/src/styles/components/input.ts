//
// Copyright 2023 DXOS.org
//

import {
  type ComponentFragment,
  type ComponentFunction,
  type Density,
  type Elevation,
  type MessageValence,
  type Size,
} from '@dxos/react-ui-types';

import { mx } from '../../util';
import {
  coarseDimensions,
  staticDisabled,
  fineDimensions,
  placeholderText,
  focusRing,
  subduedFocus,
  fineBlockSize,
  coarseBlockSize,
  staticFocusRing,
  descriptionText,
  valenceColorText,
  getSize,
  computeSize,
  sizeValue,
  getSizeHeight,
  getSizeWidth,
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

const textInputSurfaceFocus =
  'transition-colors bg-[--input-bg] focus:bg-white dark:focus:bg-neutral-925 border-transparent focus:border-transparent';

const textInputSurfaceHover =
  'hover:bg-[--input-bg-hover] dark:hover:bg-[--input-bg-hover] focus:hover:bg-white dark:focus:hover:bg-neutral-925';

const booleanInputSurface =
  'shadow-inner transition-colors bg-neutral-125 dark:bg-neutral-700 aria-checked:bg-primary-550 dark:aria-checked:bg-primary-550 aria-[checked=mixed]:bg-primary-550 dark:aria-[checked=mixed]:bg-primary-550';

const booleanInputSurfaceHover =
  'hover:bg-neutral-150 dark:hover:bg-neutral-650 hover:aria-checked:bg-primary-600 dark:hover:aria-checked:bg-primary-600 hover:aria-[checked=mixed]:bg-primary-600 dark:hover:aria-[checked=mixed]:bg-primary-600';

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

// TODO(burdon): Factor out color defs?
const sharedSubduedInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full bg-transparent text-current',
  props.density === 'fine' ? fineBlockSize : coarseBlockSize,
  placeholderText,
  subduedFocus,
  props.disabled && staticDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full text-base rounded text-neutral-900 dark:text-white',
  textInputSurfaceFocus,
  placeholderText,
  props.density === 'fine' ? fineDimensions : coarseDimensions,
  props.disabled ? staticDisabled : textInputSurfaceHover,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full text-base rounded text-neutral-900 dark:text-white',
  textInputSurfaceFocus,
  textInputSurfaceHover,
  props.focused && 'bg-white dark:bg-neutral-925',
  placeholderText,
  inputValence(props.validationValence),
  props.disabled && staticDisabled,
  props.focused && staticFocusRing,
];

export const inputInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...etc)
    : props.variant === 'static'
    ? mx(...sharedStaticInputStyles(props), ...etc)
    : mx(
        ...sharedDefaultInputStyles(props),
        !props.disabled && focusRing,
        inputValence(props.validationValence) || neutralInputValence,
        ...etc,
      );

export const inputCheckbox: ComponentFunction<InputStyleProps> = ({ size = 5, disabled }, ...etc) =>
  mx(
    getSize(size),
    booleanInputSurface,
    !disabled && booleanInputSurfaceHover,
    'shrink-0 flex items-center justify-center rounded text-white',
    focusRing,
    ...etc,
  );

export const inputCheckboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(getSize(computeSize(sizeValue(size) * 0.7, 4)), ...etc);

export const inputSwitch: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSizeHeight(size),
    getSizeWidth(computeSize(sizeValue(size) * 1.75, 9)),
    'cursor-pointer shrink-0 bg-transparent rounded-full pli-0.5 border-2 border-neutral-500 relative aria-checked:border-primary-500 aria-checked:bg-primary-500 outline-none cursor-default',
    ...etc,
  );

export const inputSwitchThumb: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSize(size === 'px' ? 'px' : ((size - 2) as Size)),
    'block bg-neutral-500 rounded-full border-neutral-100 transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[100%] data-[state=checked]:bg-white',
    ...etc,
  );

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
  switch: inputSwitch,
  switchThumb: inputSwitchThumb,
  descriptionAndValidation: inputDescriptionAndValidation,
};
