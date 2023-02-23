//
// Copyright 2022 DXOS.org
//

import { ThemeContextValue } from '../components';
import { Density, MessageValence } from '../props';
import { mx } from '../util';
import { coarseBlockSize, defaultCoarse, defaultFine, fineBlockSize } from './density';
import { defaultDisabled } from './disabled';
import { staticFocus, focus } from './focus';
import { hover } from './hover';
import { defaultPlaceholder } from './text';
import { inputValence } from './valence';

export const defaultInput = (
  props: {
    disabled?: boolean;
    density?: Density;
    validationValence?: MessageValence;
  } = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  const { disabled, validationValence } = props;
  return mx(
    'text-neutral-900 dark:text-white',
    themeVariant === 'os'
      ? 'rounded-sm text-sm bg-white/50 dark:bg-neutral-750/50'
      : 'rounded text-base bg-white/50 focus-visible:bg-white/50 dark:bg-neutral-700/50 dark:focus-visible:bg-neutral-700/50',
    props.density === 'fine' ? defaultFine : defaultCoarse,
    focus({ ...props, variant: 'default' }, themeVariant),
    defaultPlaceholder,
    hover({ disabled }, themeVariant),
    inputValence(validationValence, themeVariant),
    disabled && defaultDisabled
  );
};

export const subduedInput = (
  props: {
    disabled?: boolean;
    density?: Density;
    validationValence?: MessageValence;
  } = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  return mx(
    'bg-transparent text-current',
    props.density === 'fine' ? fineBlockSize : coarseBlockSize,
    focus({ ...props, variant: 'subdued' }, themeVariant),
    defaultPlaceholder
  );
};

export const staticInput = ({
  disabled,
  focused,
  validationValence
}: {
  disabled?: boolean;
  focused?: boolean;
  density?: Density;
  validationValence?: MessageValence;
}) => {
  return mx(
    defaultPlaceholder,
    'text-base rounded bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
    inputValence(validationValence),
    disabled && defaultDisabled,
    focused && staticFocus
  );
};
