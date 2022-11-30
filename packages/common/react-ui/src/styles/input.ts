//
// Copyright 2022 DXOS.org
//

import { MessageValence } from '../props';
import { mx } from '../util';
import { defaultDisabled } from './disabled';
import { defaultFocus, staticFocus } from './focus';
import { defaultHover } from './hover';
import { defaultPlaceholder } from './text';
import { valenceInputBorder } from './valence';

export const defaultInput = ({
  borders,
  typography,
  rounding,
  disabled,
  validationValence
}: {
  borders?: string;
  typography?: string;
  rounding?: string;
  disabled?: boolean;
  validationValence?: MessageValence;
}) => {
  return mx(
    defaultFocus,
    defaultPlaceholder,
    defaultHover({ disabled }),
    'bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
    typography ?? 'text-base',
    borders ?? 'border',
    borders ?? valenceInputBorder(validationValence),
    rounding ?? 'rounded',
    disabled && defaultDisabled
  );
};

export const staticInput = ({
  borders,
  typography,
  rounding,
  disabled,
  focused,
  validationValence
}: {
  borders?: string;
  typography?: string;
  rounding?: string;
  disabled?: boolean;
  focused?: boolean;
  validationValence?: MessageValence;
}) => {
  return mx(
    defaultPlaceholder,
    'bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
    typography ?? 'text-base',
    borders ?? 'border',
    borders ?? valenceInputBorder(validationValence),
    rounding ?? 'rounded',
    disabled && defaultDisabled,
    focused && staticFocus
  );
};
