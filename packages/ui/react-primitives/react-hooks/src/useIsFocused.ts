//
// Copyright 2022 DXOS.org
//

// Based upon the useIsFocused hook which is part of the `rci` project:
/// https://github.com/leonardodino/rci/blob/main/packages/use-is-focused

import { type RefObject, useEffect, useRef, useState } from 'react';

export const useIsFocused = (inputRef: RefObject<HTMLInputElement | null>) => {
  const [isFocused, setIsFocused] = useState<boolean | undefined>(undefined);
  const isFocusedRef = useRef<boolean | undefined>(isFocused);

  isFocusedRef.current = isFocused;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);

    if (isFocusedRef.current === undefined) {
      setIsFocused(document.activeElement === input);
    }

    return () => {
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
    };
  }, [inputRef, setIsFocused]);

  return isFocused;
};
