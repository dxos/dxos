//
// Copyright 2022 DXOS.org
//

import { useInput, useFocus, useFocusManager } from 'ink';
import WrappedTextInput from 'ink-text-input';
import React, { FC, useEffect, useMemo } from 'react';

// https://github.com/vadimdemedes/ink-text-input
export const TextInput: FC<{
  focus?: boolean
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  onFocus?: (value: boolean) => void
  placeholder?: string
}> = ({
  focus,
  value,
  onChange,
  onSubmit,
  onFocus,
  placeholder
}) => {
  const focusId = useMemo(() => `text-input-${Date.now()}`, []);
  const { focus: setFocus, isFocused } = useFocus({ id: focusId, isActive: focus });
  const { focusPrevious, focusNext } = useFocusManager();

  useEffect(() => {
    onFocus?.(isFocused);
  }, [isFocused]);

  useInput((input, key) => {
    if (key.escape) {
      onChange(''); // TODO(burdon): Revert value.
      setFocus(focusId);
    } else if (key.upArrow) {
      focusPrevious();
    } else if (key.downArrow) {
      focusNext();
    }
  }, { isActive: isFocused });

  return (
    <WrappedTextInput
      focus={isFocused}
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      showCursor={isFocused}
    />
  );
};
