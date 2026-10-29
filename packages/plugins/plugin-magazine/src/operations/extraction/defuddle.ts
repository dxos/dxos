//
// Copyright 2026 DXOS.org
//

import Defuddle, { type DefuddleResponse } from 'defuddle/full';

/**
 * Runs defuddle with its DOM build where `DOMParser` exists, so `prune` can edit the document first;
 * elsewhere it delegates to `defuddle/node` (linkedom), loaded lazily to keep it out of browser bundles.
 */
export const parseArticle = async (
  html: string,
  url: string | undefined,
  prune: (doc: Document) => void,
): Promise<DefuddleResponse> => {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    prune(doc);
    return new Defuddle(doc, { url, separateMarkdown: true }).parse();
  }
  // Pruning is DOM-based, so the node path may keep trailing chrome (e.g. theregister.com) until a
  // linkedom-based pass exists.
  const { Defuddle: DefuddleNode } = await import('defuddle/node');
  return DefuddleNode(html, url, { separateMarkdown: true });
};
