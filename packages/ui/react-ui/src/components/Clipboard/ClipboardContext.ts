//
// Copyright 2023 DXOS.org
//

import { createContext, useContext } from 'react';

// Kept out of `ClipboardProvider.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type ClipboardContextValue = {
  textValue: string;
  setTextValue: (nextValue: string) => Promise<void>;
};

export const ClipboardContext = createContext<ClipboardContextValue>({
  textValue: '',
  setTextValue: async (_) => {},
});

export const useClipboard = () => useContext(ClipboardContext);
