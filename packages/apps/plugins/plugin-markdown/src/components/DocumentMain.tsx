//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { ThreadAction } from '@braneframe/plugin-thread';
import { type Document as DocumentType } from '@braneframe/types';
import { useIntent } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Comment, useTextModel } from '@dxos/react-ui-editor';

import { EditorMain, type EditorMainProps } from './EditorMain';

export const DocumentMain: FC<
  { document: DocumentType } & Pick<EditorMainProps, 'toolbar' | 'readonly' | 'editorMode' | 'extensions'>
> = ({ document, ...props }) => {
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document.content });

  const comments = useMemo<Comment[]>(() => {
    return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
  }, [document.comments]);

  // TODO(burdon): Move into EditorMain?
  const { dispatch } = useIntent();
  useEffect(() => {
    void dispatch({
      action: ThreadAction.SELECT,
    });
  }, [document.id]);

  if (!model) {
    return null;
  }

  return <EditorMain model={model} comments={comments} {...props} />;
};
