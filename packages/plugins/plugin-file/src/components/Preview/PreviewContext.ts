//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { type PdfApi, type PdfCanvasState, type PdfFit } from '../PdfCanvas/index.ts';

// Kept out of `Preview.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

/**
 * What the toolbar needs from a paged document. Present only while such a document is displayed —
 * an image has no pages to step through and no text to search.
 */
export type PreviewPaged = PdfCanvasState & {
  api: PdfApi | undefined;
  fit: PdfFit;
  setFit: (fit: PdfFit) => void;
};

export type PreviewContextValue = {
  type: string;
  url: string;
  /** Attendable id of the surrounding article, when there is one; scopes the toolbar's shortcuts. */
  attendableId?: string;
  /** Filename, when known; used for the download affordance and the unsupported-type details. */
  name?: string;
  size?: number;
  paged?: PreviewPaged;
  setPaged: (paged: PreviewPaged | undefined) => void;
};

export const PreviewContext = createContext<PreviewContextValue | undefined>(undefined);

export const usePreview = (consumer: string): PreviewContextValue => {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error(`${consumer} must be used within a Preview.Root.`);
  }
  return context;
};
