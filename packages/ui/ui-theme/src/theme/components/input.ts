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
} from '@dxos/ui-types';

import { mx } from '../../util';
import {
  coarseBlockSize,
  coarseDimensions,
  computeSize,
  fineBlockSize,
  fineDimensions,
  focusRing,
  getSize,
  getSizeHeight,
  getSizeWidth,
  sizeValue,
  staticDisabled,
  staticFocusRing,
  subduedFocus,
  textValence,
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

export const inputTextLabel = 'py-1 text-sm text-description';

const textInputSurfaceFocus =
  'transition-colors bg-input-surface-text focus:bg-focus-surface border border-separator focus:border-separator';

const textInputSurfaceHover = 'hover:bg-input-surface-text focus:hover:bg-focus-surface';

const booleanInputSurface =
  'shadow-inner transition-colors bg-un-accent aria-checked:bg-accent-surface aria-[checked=mixed]:bg-accent-surface';

const booleanInputSurfaceHover =
  'hover:bg-un-accent-hover hover:aria-checked:bg-accent-surface-hover hover:aria-[checked=mixed]:bg-accent-surface-hover';

// TODO(burdon): Replace with semantic tokens.
const inputValence = (valence?: MessageValence) => {
  switch (valence) {
    case 'success':
      return 'shadow-emerald-500/50 dark:shadow-emerald-600/50';
    case 'info':
      return 'shadow-cyan-500/50 dark:shadow-cyan-600/50';
    case 'warning':
      return 'shadow-amber-500/50 dark:shadow-amber-600/50';
    case 'error':
      return 'shadow-rose-500/50 dark:shadow-rose-600/50';
  }
};

const sharedSubduedInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'py-0 w-full bg-transparent text-current placeholder-placeholder',
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  props.density === 'fine' ? fineBlockSize : coarseBlockSize,
  subduedFocus,
  props.disabled && staticDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'py-0 w-full text-base-surface-text rounded-xs text-[color:var(--surface-text)] placeholder-placeholder',
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  textInputSurfaceFocus,
  props.density === 'fine' ? fineDimensions : coarseDimensions,
  props.disabled ? staticDisabled : textInputSurfaceHover,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  'py-0 w-full text-base-surface-text rounded-xs text-[color:var(--surface-text)] placeholder-placeholder',
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  textInputSurfaceFocus,
  textInputSurfaceHover,
  props.focused && 'bg-attention',
  inputValence(props.validationValence),
  props.disabled && staticDisabled,
  props.focused && staticFocusRing,
];

const inputInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...etc)
    : props.variant === 'static'
      ? mx(...sharedStaticInputStyles(props), ...etc)
      : mx(
          ...sharedDefaultInputStyles(props),
          !props.disabled && focusRing,
          inputValence(props.validationValence),
          ...etc,
        );

const inputTextArea: ComponentFunction<InputStyleProps> = (props, ...etc) => inputInput(props, ...['-mb-1.5', ...etc]);

const inputCheckbox: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx('dx-checkbox dx-focus-ring', getSize(size), ...etc);

const inputCheckboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5, checked }, ...etc) =>
  mx(getSize(computeSize(sizeValue(size) * 0.65, 4)), !checked && 'invisible', ...etc);

const inputSwitch: ComponentFunction<InputStyleProps> = ({ size = 5, disabled }, ...etc) =>
  mx(
    getSizeHeight(size),
    getSizeWidth(computeSize(sizeValue(size) * 1.75, 9)),
    booleanInputSurface,
    !disabled && booleanInputSurfaceHover,
    // TODO(burdon): Added m-1 margin to make 40px width to align with 40px icon button.
    'cursor-pointer shrink-0 rounded-full px-1 mx-1 relative',
    focusRing,
    ...etc,
  );

const inputSwitchThumb: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx(
    getSize(size === 'px' ? 'px' : ((size - 2) as Size)),
    'block bg-white rounded-full transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[100%]',
    ...etc,
  );

const inputWithSegmentsInput: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx(
    'font-mono selection:bg-transparent mx-auto',
    props.density === 'fine' ? 'text-base pointer-fine:text-sm' : 'text-lg',
    props.disabled && 'cursor-not-allowed',
    ...etc,
  );

const inputSegment: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx(
    'flex items-center justify-center font-mono',
    props.density === 'fine' ? 'size-10 pointer-fine:size-8 rounded-xs' : 'size-12 rounded-xs',
    'text-[color:var(--surface-text)]',
    'transition-colors border border-separator bg-input-surface-text',
    'data-[focused]:bg-attention data-[focused]:border-neutral-focus-indicator',
    'data-[focused]:ring-2 data-[focused]:ring-offset-0 data-[focused]:ring-neutral-focus-indicator',
    inputValence(props.validationValence),
    props.disabled && staticDisabled,
    ...etc,
  );

const inputLabel: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('block', inputTextLabel, props.srOnly && 'sr-only', ...etc);

const inputDescription: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('text-description', props.srOnly && 'sr-only', ...etc);

const inputDescriptionAndValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('leading-none my-1.5', props.srOnly && 'sr-only', ...etc);

const inputValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx(inputTextLabel, props.srOnly ? 'sr-only' : textValence(props.validationValence), ...etc);

export const inputTheme = {
  input: inputInput,
  textArea: inputTextArea,
  inputWithSegments: inputWithSegmentsInput,
  segment: inputSegment,
  checkbox: inputCheckbox,
  checkboxIndicator: inputCheckboxIndicator,
  label: inputLabel,
  description: inputDescription,
  switch: inputSwitch,
  switchThumb: inputSwitchThumb,
  validation: inputValidation,
  descriptionAndValidation: inputDescriptionAndValidation,
};
