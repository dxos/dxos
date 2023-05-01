//
// Copyright 2023 DXOS.org
//

import { ComponentFragment, ComponentFunction, Density, MessageValence } from '@dxos/aurora-types';

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
  staticFocus
} from '../fragments';

export type InputStyleProps = Partial<{
  variant: 'default' | 'subdued' | 'static';
  disabled: boolean;
  focused: boolean;
  density: Density;
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

const sharedSubduedInputStyles: ComponentFragment<InputStyleProps> = (props) => {
  return [
    'bg-transparent text-current',
    props.density === 'fine' ? fineBlockSize : coarseBlockSize,
    defaultPlaceholder,
    subduedFocus,
    props.disabled && defaultDisabled
  ];
};

const sharedDefaultInputStyles: ComponentFragment<InputStyleProps> = (props) => {
  return [
    'text-neutral-900 dark:text-white',
    defaultPlaceholder,
    props.density === 'fine' ? defaultFine : defaultCoarse,
    props.disabled && defaultDisabled
  ];
};

const sharedStaticInputStyles: ComponentFragment<InputStyleProps> = (props) => {
  return [
    defaultPlaceholder,
    'text-base rounded bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
    inputValence(props.validationValence),
    props.disabled && defaultDisabled,
    props.focused && staticFocus
  ];
};

export const inputAppInput: ComponentFunction<InputStyleProps> = (props, ...options) => {
  return props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...options)
    : props.variant === 'static'
    ? mx(sharedStaticInputStyles(props), ...options)
    : mx(
        'rounded text-base bg-white/50 focus-visible:bg-white/50 dark:bg-neutral-700/50 dark:focus-visible:bg-neutral-700/50',
        !props.disabled && defaultFocus,
        !props.disabled && defaultHover,
        inputValence(props.validationValence) || neutralInputValence,
        ...sharedDefaultInputStyles(props),
        ...options
      );
};

export const inputOsInput: ComponentFunction<InputStyleProps> = (props, ...options) => {
  return props.variant === 'subdued'
    ? mx(...sharedSubduedInputStyles(props), ...options)
    : props.variant === 'static'
    ? mx(sharedStaticInputStyles(props), ...options)
    : mx(
        'rounded-sm text-sm bg-white/50 dark:bg-neutral-750/50',
        !props.disabled && osFocus,
        !props.disabled && osHover,
        inputValence(props.validationValence) ||
          'border-transparent focus-visible:border-transparent dark:focus-visible:border-transparent',
        sharedDefaultInputStyles(props),
        ...options
      );
};
