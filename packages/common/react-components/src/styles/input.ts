//
// Copyright 2022 DXOS.org
//

import { ThemeContextValue } from '../components';
import { MessageValence } from '../props';
import { mx } from '../util';
import { defaultDisabled } from './disabled';
import { staticFocus, focus } from './focus';
import { hover } from './hover';
import { defaultPlaceholder } from './text';
import { valenceInputBorder } from './valence';

export const defaultInput = (
  props: {
    disabled?: boolean;
    validationValence?: MessageValence;
  } = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  const { disabled, validationValence } = props;
  return mx(
    'text-neutral-900 dark:text-white border',
    themeVariant === 'os'
      ? 'rounded-sm text-sm bg-neutral-50/50 dark:bg-neutral-900/50'
      : 'rounded text-base bg-white/50 focus-visible:bg-white/50 dark:bg-neutral-700/50 dark:focus-visible:bg-neutral-700/50 shadow-sm',
    focus({ ...props, variant: 'default' }, themeVariant),
    defaultPlaceholder,
    hover({ disabled }, themeVariant),
    valenceInputBorder(validationValence, themeVariant),
    disabled && defaultDisabled
  );
};

export const subduedInput = (
  props: {
    disabled?: boolean;
    validationValence?: MessageValence;
  } = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  return mx(
    'bg-transparent text-current',
    themeVariant === 'os' ? 'rounded-sm' : 'rounded',
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
  validationValence?: MessageValence;
}) => {
  return mx(
    defaultPlaceholder,
    'text-base border rounded bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
    valenceInputBorder(validationValence),
    disabled && defaultDisabled,
    focused && staticFocus
  );
};
