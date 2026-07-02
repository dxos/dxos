//
// Copyright 2026 DXOS.org
//

// Import from submodules, not the `../actions` / `../picker` barrels: those transitively pull
// `webextension-polyfill` (via the registry), which throws when this extractor is loaded in the
// content script's node test environment.
import { type Snapshot } from '../actions/types';
import { harvestFavicon, harvestHints } from '../picker/harvest';
import { type Extractor } from './types';

export const MAX_HTML_LENGTH = 500_000;

/**
 * Default extractor: a generic page capture (source, og/JSON-LD hints,
 * current text selection, truncated document HTML).
 */
export const snapshotExtractor: Extractor<Snapshot> = {
  name: 'snapshot',
  run: async ({ document: doc }) => {
    const html = doc.documentElement?.outerHTML ?? '';
    const truncated = html.length > MAX_HTML_LENGTH;
    const selectionText = doc.defaultView?.getSelection?.()?.toString().trim();
    return {
      source: {
        url: doc.location?.href ?? '',
        title: doc.title ?? '',
        favicon: harvestFavicon(doc),
        clippedAt: new Date().toISOString(),
      },
      selection: selectionText ? { text: selectionText } : undefined,
      hints: harvestHints(doc),
      html: truncated ? html.slice(0, MAX_HTML_LENGTH) : html,
      htmlTruncated: truncated || undefined,
    };
  },
};
