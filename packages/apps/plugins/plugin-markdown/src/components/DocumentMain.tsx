//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { useMemo } from 'react';

import { type DocumentType } from '@braneframe/types';
import { createDocAccessor, fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { createDataExtensions, localStorageStateStoreAdapter, state } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';

type DocumentMainProps = { document: DocumentType } & Omit<EditorMainProps, 'id'>;

/**
 * @deprecated
 */
const DocumentMain = ({ document: doc, extensions: _extensions = [], ...props }: DocumentMainProps) => {
  const identity = useIdentity();
  const extensions = useMemo(
    () => [
      _extensions,
      createDataExtensions({
        id: doc.id,
        text: doc.content && createDocAccessor(doc.content, ['content']),
        space: getSpace(doc),
        identity,
      }),
      state(localStorageStateStoreAdapter),
    ],
    [doc, _extensions, identity],
  );

  const { scrollTo, selection } = useMemo(() => {
    const { scrollTo, selection } = localStorageStateStoreAdapter.getState(doc.id) ?? {};
    return {
      scrollTo: scrollTo?.from ? EditorView.scrollIntoView(scrollTo.from, { y: 'start', yMargin: 0 }) : undefined,
      selection,
    };
  }, [doc]);

  const comments =
    doc.threads?.filter((thread) => thread.anchor).map((thread) => ({ id: thread.id, cursor: thread.anchor! })) ?? [];

  if (!doc.content) {
    return null;
  }

  return (
    <EditorMain
      id={fullyQualifiedId(doc)}
      doc={doc.content.content}
      scrollTo={scrollTo}
      selection={selection}
      extensions={extensions}
      comments={comments}
      {...props}
    />
  );
};

export default DocumentMain;

export type DocumentMain = typeof DocumentMain;
