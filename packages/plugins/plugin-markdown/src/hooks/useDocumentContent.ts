//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { type URI } from '@dxos/keys';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

import { type DocumentType } from './useExtensions.tsx';

/** Why a document has no content binding. */
export type ContentStatus = 'loading' | 'missing' | 'deleted';

export type DocumentContent = {
  /** The Text the editor binds to. */
  target?: Text.Text;
  /** Set while there is no target: the editor is not editable. */
  status?: ContentStatus;
};

/**
 * Resolves the Text a document's editor binds to, and why it is unavailable when it does not resolve.
 */
export const useDocumentContent = (object: DocumentType | undefined): DocumentContent => {
  const contentRef = Obj.instanceOf(Markdown.Document, object) ? object.content : undefined;
  const loadedContent = useResolveRef(contentRef);
  const target = loadedContent ?? (Obj.instanceOf(Text.Text, object) ? object : undefined);

  const unresolvedUri = contentRef && !target ? contentRef.uri : undefined;
  const [settled, setSettled] = useState<{ uri: URI.URI; status: 'missing' | 'deleted' }>();
  useEffect(() => {
    if (!unresolvedUri || !contentRef) {
      return;
    }

    // Runs again whenever the target drops out, so a Text deleted while open is caught too.
    let cancelled = false;
    contentRef
      .tryLoad({ deleted: 'include' })
      .then((loaded) => {
        const status = loaded === undefined ? 'missing' : Obj.isDeleted(loaded) ? 'deleted' : undefined;
        if (!cancelled && status) {
          log('document content unavailable', { uri: unresolvedUri, status });
          setSettled({ uri: unresolvedUri, status });
        }
      })
      .catch((error) => log.catch(error));
    return () => {
      cancelled = true;
    };
  }, [unresolvedUri]);

  if (!unresolvedUri) {
    return { target };
  }

  return { status: settled?.uri === unresolvedUri ? settled.status : 'loading' };
};
