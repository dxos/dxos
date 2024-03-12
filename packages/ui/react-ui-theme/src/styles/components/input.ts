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
  'transition-colors surface-input focus:surface-attention border-transparent focus:border-transparent';

const textInputSurfaceHover = 'hover:surface-hover focus:hover:surface-attention';

const booleanInputSurface =
  'shadow-inner transition-colors surface-unAccent aria-checked:surface-accent aria-[checked=mixed]:surface-accent';

const booleanInputSurfaceHover =
  'hover:surface-unAccentHover hover:aria-checked:surface-accentHover hover:aria-[checked=mixed]:surface-accentHover';

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
  'is-full text-base rounded text-[color:var(--surface-text)]',
  textInputSurfaceFocus,
  placeholderText,
  props.density === 'fine' ? fineDimensions : coarseDimensions,
  props.disabled ? staticDisabled : textInputSurfaceHover,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'is-full text-base rounded text-[color:var(--surface-text)]',
  textInputSurfaceFocus,
  textInputSurfaceHover,
  props.focused && 'surface-attention',
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

export const inputCheckbox: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx('ch-checkbox ch-focus-ring', getSize(size), ...etc);

export const inputCheckboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(getSize(computeSize(sizeValue(size) * 0.65, 4)), ...etc);

export const inputSwitch: ComponentFunction<InputStyleProps> = ({ size = 5, disabled }, ...etc) =>
  mx(
    getSizeHeight(size),
    getSizeWidth(computeSize(sizeValue(size) * 1.75, 9)),
    booleanInputSurface,
    !disabled && booleanInputSurfaceHover,
    // TODO(burdon): Added m-1 margin to make 40px width to align with 40px icon button.
    'cursor-pointer shrink-0 rounded-full pli-1 mx-1 relative',
    focusRing,
    ...etc,
  );

export const inputSwitchThumb: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSize(size === 'px' ? 'px' : ((size - 2) as Size)),
    'block bg-white rounded-full separator-separator transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[100%]',
    ...etc,
  );

export const inputWithSegmentsInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx('font-mono selection:bg-transparent mli-auto', props.disabled && 'cursor-not-allowed', ...etc);

export const inputLabel: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('block text-sm font-medium', props.srOnly && 'sr-only', ...etc);

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
