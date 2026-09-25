//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

import * as Host from '@dxos/automerge-proxy/Host';
import { Context } from '@dxos/context';
import { type DocumentObjectRow } from '@dxos/index-core';

import { type AutomergeHost } from '../automerge/index.ts';
import { documentsFromIndex } from './indexed.ts';

/** Long enough for a network fetch; the client already knows it is waiting from the `requesting` event. */
const LOAD_TIMEOUT = 5 * 60_000;

export type ProxyHostProps = {
  automergeHost: AutomergeHost;
  /** The objects of the given documents as the index holds them, read without loading the documents. */
  readIndexed?: (documentIds: readonly string[]) => Promise<readonly DocumentObjectRow[]>;
};

/**
 * `@dxos/automerge-proxy`'s host over the worker's Automerge host, serving clients that keep proxies
 * of documents; the index supplies the documents' copies.
 */
export const createProxyHost = ({ automergeHost, readIndexed }: ProxyHostProps): Host.DocumentHost =>
  new Host.DocumentHost({
    store: {
      withDocument: async (documentId, fn) => {
        using lease = await automergeHost.loadDoc(Context.default(), asDocumentId(documentId), {
          timeout: LOAD_TIMEOUT,
        });
        return lease ? fn(lease) : undefined;
      },
      isStored: (documentId) => automergeHost.hasDocOnDisk(asDocumentId(documentId)),
      save: (documentIds) => automergeHost.flush(Context.default(), { documentIds }),
      onChanged: (listener) => automergeHost.documentHeadsChanged.on(({ documentId }) => listener(documentId)),
      // As a replica subscription leases the documents it syncs.
      hold: (documentId) => automergeHost.acquireDoc(asDocumentId(documentId)),
    },
    copies: readIndexed && { read: async (documentIds) => documentsFromIndex(await readIndexed(documentIds)) },
  });

/** Document ids reach the host as the plain strings the contract carries. */
const asDocumentId = (documentId: string): DocumentId => documentId as DocumentId;
