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
  disabled,
  validationValence
}: {
  disabled?: boolean;
  validationValence?: MessageValence;
}) => {
  return mx(
    'text-base border rounded bg-white/50 text-neutral-900 dark:bg-neutral-700/50 dark:text-white',
    defaultFocus,
    defaultPlaceholder,
    defaultHover({ disabled }),
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
