//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { useEffect, useMemo } from 'react';

import { type DocumentType } from '@braneframe/types';
import { createDocAccessor, fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { createDataExtensions, listener, localStorageStateStoreAdapter, state } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';
import { getFallbackName, setFallbackName } from '../util';

type DocumentEditorProps = { document: DocumentType } & Omit<EditorMainProps, 'id'>;

/**
 * Editor for a `DocumentType`.
 */
// TODO(wittjosiah): Reconcile with DocumentSection & DocumentCard.
const DocumentEditor = ({ document: doc, extensions: _extensions = [], ...props }: DocumentEditorProps) => {
  const identity = useIdentity();
  const extensions = useMemo(
    () => [
      // NOTE: Data extensions must be first so that automerge is updated before other extensions compute their state.
      createDataExtensions({
        id: doc.id,
        text: doc.content && createDocAccessor(doc.content, ['content']),
        space: getSpace(doc),
        identity,
      }),
      state(localStorageStateStoreAdapter),
      listener({
        onChange: (text) => {
          setFallbackName(doc, text);
        },
      }),
      _extensions,
    ],
    [doc, doc.content, _extensions, identity],
  );

  const initialValue = useMemo(() => doc.content?.content, [doc.content]);

  // Migrate gradually to `fallbackName`.
  useEffect(() => {
    if (!doc.fallbackName && doc.content?.content) {
      doc.fallbackName = getFallbackName(doc.content.content);
    }
  }, [doc]);

  const { scrollTo, selection } = useMemo(() => {
    const { scrollTo, selection } = localStorageStateStoreAdapter.getState(doc.id) ?? {};
    return {
      scrollTo: scrollTo?.from ? EditorView.scrollIntoView(scrollTo.from, { y: 'start', yMargin: 0 }) : undefined,
      selection,
    };
  }, [doc]);

  if (!doc.content) {
    return null;
  }

  return (
    <EditorMain
      id={fullyQualifiedId(doc)}
      initialValue={initialValue}
      scrollTo={scrollTo}
      selection={selection}
      extensions={extensions}
      {...props}
    />
  );
};

export default DocumentEditor;

export type DocumentEditor = typeof DocumentEditor;
