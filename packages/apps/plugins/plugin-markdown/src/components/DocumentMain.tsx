//
// Copyright 2024 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type Document as DocumentType } from '@braneframe/types';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Comment, createDataExtensions, useDocAccessor } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';

/**
 * @deprecated
 */
// TODO(burdon): Move logic into plugin.
const DocumentMain: FC<{ document: DocumentType } & Pick<EditorMainProps, 'toolbar' | 'readonly' | 'extensions'>> = ({
  document,
  ...props
}) => {
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const { id, doc, accessor } = useDocAccessor(document.content);
  const extensions = useMemo(
    () => [
      //
      createDataExtensions({ id, text: accessor, space, identity }),
    ],
    [doc, accessor],
  );

  const comments = useMemo<Comment[]>(() => {
    return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
  }, [document.comments]);

  return <EditorMain id={id} doc={doc} extensions={extensions} comments={comments} {...props} />;
};

export default DocumentMain;

export type DocumentMain = typeof DocumentMain;
