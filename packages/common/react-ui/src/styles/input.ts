//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';

import { MessageValence } from '../props';
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
  return cx(
    defaultFocus,
    defaultPlaceholder,
    defaultHover({ disabled }),
    'bg-white/50 border text-neutral-900 text-sm rounded-lg dark:bg-neutral-700/50 dark:text-white',
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
  return cx(
    defaultPlaceholder,
    'bg-white/50 border text-neutral-900 text-sm rounded-lg dark:bg-neutral-700/50 dark:text-white',
    valenceInputBorder(validationValence),
    disabled && defaultDisabled,
    focused && staticFocus
  );
};
