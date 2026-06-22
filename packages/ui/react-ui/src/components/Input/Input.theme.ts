//
// Copyright 2023 DXOS.org
//

import { densityDimensions, staticDisabled } from '@dxos/ui-theme';
import { getSize, mx, snapSize, sizeValue, textValence } from '@dxos/ui-theme';
import {
  type ComponentFragment,
  type ComponentFunction,
  type Density,
  type Elevation,
  type MessageValence,
  type Size,
} from '@dxos/ui-types';

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

const textInputSurfaceFocus =
  'transition-colors bg-input-surface focus:bg-focus-surface border border-input-separator focus:border-separator';

const textInputSurfaceHover = 'hover:bg-focus-surface';

// TODO(burdon): Replace with semantic tokens.
const valence = (valence?: MessageValence) => {
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
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  'py-0 w-full bg-transparent text-current placeholder-placeholder',
  'dx-focus-subdued',
  densityDimensions(props.density),
  props.disabled && staticDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  'py-0 w-full text-base-fg rounded-xs placeholder-placeholder',
  textInputSurfaceFocus,
  densityDimensions(props.density),
  props.disabled ? staticDisabled : textInputSurfaceHover,
];

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  'py-0 w-full text-base-fg rounded-xs placeholder-placeholder',
  textInputSurfaceFocus,
  textInputSurfaceHover,
  props.focused && 'bg-attention-surface',
  valence(props.validationValence),
  props.disabled && staticDisabled,
  props.focused && 'dx-focus-static',
];

const input: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...etc)
    : props.variant === 'static'
      ? mx(...sharedStaticInputStyles(props), ...etc)
      : mx(
          ...sharedDefaultInputStyles(props),
          !props.disabled && 'dx-focus-ring',
          valence(props.validationValence),
          ...etc,
        );

const textArea: ComponentFunction<InputStyleProps> = (props, ...etc) => input(props, ...etc);

const checkbox: ComponentFunction<InputStyleProps> = ({ size = 5 }, ...etc) =>
  mx('dx-checkbox dx-focus-ring', getSize(size), ...etc);

const checkboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 5, checked }, ...etc) =>
  mx(getSize(snapSize(sizeValue(size) * 0.65, 4)), !checked && 'invisible', ...etc);

const switch_: ComponentFunction<InputStyleProps> = (_props, ...etc) => mx('dx-checkbox--switch dx-focus-ring', ...etc);

const pin: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx(
    'font-mono selection:bg-transparent mx-auto',
    props.density === 'lg'
      ? 'text-lg'
      : props.density === 'sm'
        ? 'text-sm'
        : props.density === 'xs'
          ? 'text-xs'
          : 'text-base pointer-fine:text-sm',
    props.disabled && 'cursor-not-allowed',
    ...etc,
  );

const segment: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx(
    'flex items-center justify-center tabular-nums',
    props.density === 'lg'
      ? 'size-12 rounded-xs'
      : props.density === 'sm'
        ? 'size-7 rounded-xs'
        : props.density === 'xs'
          ? 'size-6 rounded-xs'
          : 'size-10 pointer-fine:size-8 rounded-xs',
    'bg-input-surface text-base-fg transition-colors border border-separator',
    'data-[focused]:bg-attention-surface data-[focused]:border-focus-ring-subtle',
    'data-[focused]:ring-2 data-[focused]:ring-offset-0 data-[focused]:ring-focus-ring-subtle',
    valence(props.validationValence),
    props.disabled && staticDisabled,
    ...etc,
  );

const label: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('block text-sm text-description', props.srOnly && 'sr-only', ...etc);

const description: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('text-description', props.srOnly && 'sr-only', ...etc);

const descriptionAndValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('leading-none my-1.5', props.srOnly && 'sr-only', ...etc);

const validation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('text-sm text-description', props.srOnly ? 'sr-only' : textValence(props.validationValence), ...etc);

const triggerIcon: ComponentFunction<{}> = (_p, ...etc) =>
  mx(
    'shrink-0 inline-flex items-center justify-center size-7 rounded-xs',
    'bg-input-surface text-subdued hover:text-base-fg hover:bg-hover-surface',
    'dx-focus-ring',
    ...etc,
  );

const block: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx('grid place-items-center w-[var(--dx-rail-item)] h-[var(--dx-rail-item)]', ...etc);

export const inputTheme = {
  input,
  textArea,
  pin,
  segment,
  label,
  description,
  checkbox,
  checkboxIndicator,
  switch: switch_,
  block,
  validation,
  descriptionAndValidation,
  triggerIcon,
};
