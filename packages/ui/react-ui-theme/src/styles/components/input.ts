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
  coarseBlockSize,
  coarseDimensions,
  computeSize,
  descriptionText,
  fineBlockSize,
  fineDimensions,
  focusRing,
  getSize,
  getSizeHeight,
  getSizeWidth,
  placeholderText,
  sizeValue,
  staticDisabled,
  staticFocusRing,
  subduedFocus,
  valenceColorText,
} from '../fragments';

export type InputStyleProps = Partial<{
  variant: 'default' | 'subdued' | 'static';
  density: Density;
  disabled: boolean;
  elevation: Elevation;
  focused: boolean;
  validationValence: MessageValence;
  size: Size;
  checked: boolean;
}>;

export type InputMetaStyleProps = Partial<{
  srOnly: boolean;
  validationValence: MessageValence;
}>;

export const neutralInputValence = '';
export const successInputValence = 'shadow-emerald-500/50 dark:shadow-emerald-600/50';
export const infoInputValence = 'shadow-cyan-500/50 dark:shadow-cyan-600/50';
export const warningInputValence = 'shadow-amber-500/50 dark:shadow-amber-600/50';
export const errorInputValence = 'shadow-rose-500/50 dark:shadow-rose-600/50';

const textInputSurfaceFocus =
  'transition-colors bg-textInputSurface focus:bg-focusSurface border border-separator focus:border-separator';

const textInputSurfaceHover = 'hover:bg-textInputSurface focus:hover:bg-focusSurface';

const booleanInputSurface =
  'shadow-inner transition-colors bg-unAccent aria-checked:bg-accentSurface aria-[checked=mixed]:bg-accentSurface';

const booleanInputSurfaceHover =
  'hover:bg-unAccentHover hover:aria-checked:bg-accentSurfaceHover hover:aria-[checked=mixed]:bg-accentSurfaceHover';

export const inputTextLabel =
  'text-description text-xs font-medium mbs-inputSpacingBlock mbe-labelSpacingBlock first:mbs-0';

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
  'plb-0 is-full bg-transparent text-current [[data-drag-autoscroll="active"]_&]:pointer-events-none',
  props.density === 'fine' ? fineBlockSize : coarseBlockSize,
  placeholderText,
  subduedFocus,
  props.disabled && staticDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'plb-0 is-full text-baseText rounded-sm text-[color:var(--surface-text)] [[data-drag-autoscroll="active"]_&]:pointer-events-none',
  textInputSurfaceFocus,
  placeholderText,
  props.density === 'fine' ? fineDimensions : coarseDimensions,
  props.disabled ? staticDisabled : textInputSurfaceHover,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'plb-0 is-full text-baseText rounded-sm text-[color:var(--surface-text)] [[data-drag-autoscroll="active"]_&]:pointer-events-none',
  textInputSurfaceFocus,
  textInputSurfaceHover,
  props.focused && 'bg-attention',
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
  mx('dx-checkbox dx-focus-ring', getSize(size), ...etc);

export const inputCheckboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5, checked }, ...etc) =>
  mx(getSize(computeSize(sizeValue(size) * 0.65, 4)), !checked && 'invisible', ...etc);

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
    'block bg-white rounded-full transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[100%]',
    ...etc,
  );

export const inputWithSegmentsInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx('font-mono selection:bg-transparent mli-auto', props.disabled && 'cursor-not-allowed', ...etc);

export const inputLabel: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('block', inputTextLabel, props.srOnly && 'sr-only', ...etc);

export const inputDescription: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(descriptionText, props.srOnly && 'sr-only', ...etc);

export const inputDescriptionAndValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('leading-none mlb-labelSpacingBlock', props.srOnly && 'sr-only', ...etc);

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
