//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

// Kept out of `Preview.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type PreviewContextValue = {
  type: string;
  url: string;
  /** Page count once a paged document has loaded; `undefined` for everything else. */
  pageCount?: number;
  setPageCount: (pageCount: number) => void;
};

export const PreviewContext = createContext<PreviewContextValue | undefined>(undefined);

export const usePreview = (consumer: string): PreviewContextValue => {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error(`${consumer} must be used within a Preview.Root.`);
  }
  return context;
};
