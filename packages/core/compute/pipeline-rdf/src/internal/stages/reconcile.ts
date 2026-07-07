//
// Copyright 2026 DXOS.org
//

// Currently holds only `hashText` for content-based change detection; reconcile/supersession proper
// (deleting or superseding prior facts when a source changes) is deferred.

/** Stable content hash of a document's text (FNV-1a; no crypto dep, deterministic). */
export const hashText = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
};
