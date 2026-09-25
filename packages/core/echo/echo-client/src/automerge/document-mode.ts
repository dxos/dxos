//
// Copyright 2026 DXOS.org
//

/**
 * How a client holds the documents it opens: `replica` keeps an Automerge replica of each, synced
 * over the byte protocol (`RepoProxy`); `proxy` keeps a proxy from `@dxos/automerge-proxy` that the
 * services' Automerge serves (`MirrorRepo`).
 */
export type DocumentMode = 'replica' | 'proxy';

/** The mode `DX_ECHO_DOCUMENT_MODE` names; any other value leaves it unset. */
export const parseDocumentMode = (value: string | undefined): DocumentMode | undefined =>
  value === 'replica' || value === 'proxy' ? value : undefined;
