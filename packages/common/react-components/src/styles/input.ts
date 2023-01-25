//
// Copyright 2022 DXOS.org
//

import { ThemeContextValue } from '../components';
import { MessageValence } from '../props';
import { mx } from '../util';
import { defaultDisabled } from './disabled';
import { defaultFocus, staticFocus } from './focus';
import { defaultHover } from './hover';
import { defaultPlaceholder } from './text';
import { valenceInputBorder } from './valence';

export const defaultInput = (
  {
    disabled,
    validationValence
  }: {
    disabled?: boolean;
    validationValence?: MessageValence;
  } = {},
  themeVariant: ThemeContextValue['themeVariant'] = 'app'
) => {
  return mx(
    'border rounded text-neutral-900 dark:text-white',
    themeVariant === 'os'
      ? 'text-sm border bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-800/50'
      : 'text-base bg-white/50 dark:bg-neutral-700/50',
    defaultFocus,
    defaultPlaceholder,
    themeVariant === 'os' ? 'hover:bg-neutral-50 dark:hover:bg-neutral-900' : defaultHover({ disabled }),
    valenceInputBorder(validationValence),
    disabled && defaultDisabled
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
