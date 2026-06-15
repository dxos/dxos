//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext, useCallback, useContext, useState } from 'react';

export type ClipboardContextValue = {
  textValue: string;
  setTextValue: (nextValue: string) => Promise<void>;
};

export const ClipboardContext = createContext<ClipboardContextValue>({
  textValue: '',
  setTextValue: async (_) => {},
});

export const useClipboard = () => useContext(ClipboardContext);

export const ClipboardProvider = ({ children }: PropsWithChildren<{}>) => {
  const [textValue, setInternalTextValue] = useState('');
  const setTextValue = useCallback(async (nextValue: string) => {
    await navigator.clipboard.writeText(nextValue);
    return setInternalTextValue(nextValue);
  }, []);
  return <ClipboardContext.Provider value={{ textValue, setTextValue }}>{children}</ClipboardContext.Provider>;
};
