//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { useMemo } from 'react';

import { type DocumentType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { createDataExtensions, localStorageStateStoreAdapter, state, useDocAccessor } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';

type DocumentMainProps = { document: DocumentType } & Omit<EditorMainProps, 'id'>;

/**
 * @deprecated
 */
const DocumentMain = ({ document, extensions: _extensions = [], ...props }: DocumentMainProps) => {
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const { id, doc, accessor } = useDocAccessor(document.content!);
  const extensions = useMemo(
    () => [
      _extensions,
      createDataExtensions({ id, text: accessor, space, identity }),
      state(localStorageStateStoreAdapter),
    ],
    [doc, accessor],
  );

  const { scrollTo, selection } = useMemo(() => {
    const { scrollTo, selection } = localStorageStateStoreAdapter.getState(id) ?? {};
    return {
      scrollTo: scrollTo?.from ? EditorView.scrollIntoView(scrollTo.from, { y: 'start', yMargin: 0 }) : undefined,
      selection,
    };
  }, [id]);

  const comments = document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! })) ?? [];

  return (
    <EditorMain
      id={id}
      doc={doc}
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
