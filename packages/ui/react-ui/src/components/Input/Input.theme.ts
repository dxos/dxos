//
// Copyright 2023 DXOS.org
//

import { staticDisabled } from '@dxos/ui-theme';
import { getSize, mx, sizeValue, snapSize, textValence } from '@dxos/ui-theme';
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

// Height and inline padding come from the density knobs (theme/spacing.css) rather than utilities,
// so a density class on any ancestor resizes the control without a matching React prop.
const controlSize = 'min-h-(--dx-control) px-(--dx-control-pad) leading-(--dx-control-leading)';

const sharedSubduedInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  'py-0 w-full bg-transparent text-current placeholder-placeholder',
  'dx-focus-subdued',
  controlSize,
  props.disabled && staticDisabled,
];

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => [
  '[[data-drag-autoscroll="active"]_&]:pointer-events-none',
  'py-0 w-full text-base-fg placeholder-placeholder',
  'dx-input',
  controlSize,
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
      : mx(...sharedDefaultInputStyles(props), valence(props.validationValence), ...etc);

// An `<input>` centres its single line inside `--dx-control`, so `py-0` still reads as inset; a
// textarea lays text from the top edge, where the same rule puts the first line against the border.
// The inline pad is reused for the block axis: it lands within ~1.5px of the input's optical inset
// (6.5px against a 32px control) and tracks density with it. Centring it exactly would need
// `calc((var(--dx-control) - 1lh) / 2)`, and `lh` is newer than this app's browser targets
// (chrome108 / firefox104 / safari16), where the whole declaration would be dropped.
const textArea: ComponentFunction<InputStyleProps> = (props, ...etc) => input(props, 'py-(--dx-control-pad)', ...etc);

// Container that carries the input surface/border/focus when the field has adornments; the inner
// `<input>` renders "bare" (subdued) so the box wraps the whole row (start adornment · field · end).
const container: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  props.variant === 'subdued' || props.variant === 'static'
    ? mx('flex items-center w-full', props.disabled && staticDisabled, ...etc)
    : mx(
        // `p-0` cancels dx-input's default padding: the inset comes from the adornments and the inner field.
        'flex items-center w-full dx-input p-0',
        valence(props.validationValence),
        props.disabled ? staticDisabled : textInputSurfaceHover,
        ...etc,
      );

const adornment: ComponentFunction<Partial<{ side: 'start' | 'end' }>> = (props, ...etc) =>
  mx('shrink-0 flex items-center gap-1 text-description', props.side === 'start' ? 'ps-2' : 'pe-2', ...etc);

const checkbox: ComponentFunction<InputStyleProps> = ({ size = 4 }, ...etc) =>
  mx('dx-checkbox dx-focus-ring', getSize(size), ...etc);

const checkboxIndicator: ComponentFunction<InputStyleProps> = ({ size = 4, checked }, ...etc) =>
  mx(getSize(snapSize(sizeValue(size) * 0.65, 4)), !checked && 'invisible', ...etc);

const switch_: ComponentFunction<InputStyleProps> = (_props, ...etc) => mx('dx-checkbox--switch dx-focus-ring', ...etc);

const pin: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx(
    'font-mono selection:bg-transparent mx-auto',
    props.density === 'lg' ? 'text-lg' : props.density === 'sm' ? 'text-sm' : 'text-base pointer-fine:text-sm',
    props.disabled && 'cursor-not-allowed',
    ...etc,
  );

const segment: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx(
    'flex items-center justify-center tabular-nums',
    // A PIN segment is a square control, so it takes the density height on both axes.
    'size-(--dx-control) rounded-xs',
    'bg-input-surface text-base-fg transition-colors border border-input-separator',
    'data-[focused]:bg-attention-surface data-[focused]:border-focus-ring-subtle',
    'data-[focused]:ring-2 data-[focused]:ring-offset-0 data-[focused]:ring-focus-ring-subtle',
    valence(props.validationValence),
    props.disabled && staticDisabled,
    ...etc,
  );

// Matches `react-ui-form`'s `fieldLabel` geometry: a control-height row with the text centred, so a
// label sits the same distance from its field in a bare `Input.Root` as in a schema-driven form.
// Only when visible — an sr-only label is out of flow, and a min-height on it would be meaningless.
const label: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('text-sm text-description', props.srOnly ? 'sr-only' : 'flex items-center min-h-(--dx-control)', ...etc);

const description: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('text-description', props.srOnly && 'sr-only', ...etc);

const descriptionAndValidation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('leading-none my-1.5', props.srOnly && 'sr-only', ...etc);

const validation: ComponentFunction<InputMetaStyleProps> = (props, ...etc) =>
  mx('text-sm text-description', props.srOnly ? 'sr-only' : textValence(props.validationValence), ...etc);

const triggerIcon: ComponentFunction<{}> = (_p, ...etc) =>
  mx(
    'shrink-0 inline-flex items-center justify-center size-(--dx-control-sm) rounded-xs',
    'bg-input-surface text-subdued hover:text-base-fg hover:bg-hover-surface',
    'dx-focus-ring',
    ...etc,
  );

const block: ComponentFunction<InputStyleProps> = (props, ...etc) =>
  mx('grid place-items-center w-[var(--dx-rail-item)] h-[var(--dx-rail-item)]', ...etc);

export const inputTheme = {
  input,
  container,
  adornment,
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
