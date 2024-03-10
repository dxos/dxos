//
// Copyright 2024 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Comment, useTextModel } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';
import { type DocumentType } from './types';

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
  const model = useTextModel({ identity, space, text: document.content });
  const comments = useMemo<Comment[]>(() => {
    return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
  }, [document.comments]);

  if (!model) {
    return null;
  }

  return <EditorMain model={model} comments={comments} {...props} />;
};

export default DocumentMain;

export type DocumentMain = typeof DocumentMain;
