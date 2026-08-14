//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useState } from 'react';

import { ClipboardContext } from './ClipboardContext';

export const ClipboardProvider = ({ children }: PropsWithChildren<{}>) => {
  const [textValue, setInternalTextValue] = useState('');
  const setTextValue = useCallback(async (nextValue: string) => {
    await navigator.clipboard.writeText(nextValue);
    return setInternalTextValue(nextValue);
  }, []);
  return <ClipboardContext.Provider value={{ textValue, setTextValue }}>{children}</ClipboardContext.Provider>;
};
