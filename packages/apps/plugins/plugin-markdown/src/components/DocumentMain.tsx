//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type Document as DocumentType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Comment, createDataExtensions, useDocAccessor } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';

type DocumentMainProps = { document: DocumentType } & Omit<EditorMainProps, 'id'>;

/**
 * @deprecated
 */
const DocumentMain = ({ document, extensions: _extensions, ...props }: DocumentMainProps) => {
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const { id, doc, accessor } = useDocAccessor(document.content);
  const extensions = useMemo(
    () => [_extensions, createDataExtensions({ id, text: accessor, space, identity })],
    [doc, accessor],
  );

  const comments = useMemo<Comment[]>(() => {
    return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
  }, [document.comments]);

  return <EditorMain id={id} doc={doc} {...props} extensions={extensions} comments={comments} />;
};

export default DocumentMain;

export type DocumentMain = typeof DocumentMain;
