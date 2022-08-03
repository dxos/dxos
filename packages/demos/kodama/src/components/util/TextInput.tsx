//
// Copyright 2022 DXOS.org
//

import { useInput, useFocus, useFocusManager } from 'ink';
import WrappedTextInput from 'ink-text-input';
import React, { FC } from 'react';

// TODO(burdon): Wrap input to support up/down focus.
// https://github.com/vadimdemedes/ink-text-input
export const TextInput: FC<{
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
}> = ({
  value,
  onChange,
  onSubmit,
  placeholder
}) => {
  const { isFocused } = useFocus();
  const { focusPrevious, focusNext } = useFocusManager();

  useInput((input, key) => {
    if (key.upArrow) {
      focusPrevious();
    } else if (key.downArrow) {
      focusNext();
    }
  }, { isActive: isFocused });

  return (
    <WrappedTextInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
    />
  );
};
