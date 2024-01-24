//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { ThreadAction } from '@braneframe/plugin-thread';
import { type Document as DocumentType } from '@braneframe/types';
import { useIntent } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Comment, useTextModel, type Extension } from '@dxos/react-ui-editor';

import { EditorMain, MainLayout } from './EditorMain';
import type { MarkdownSettingsProps } from '../types';

export const DocumentMain: FC<{
  document: DocumentType;
  readonly?: boolean;
  editorMode: MarkdownSettingsProps['editorMode'];
  extensions: Extension[];
}> = ({ document, readonly, editorMode, extensions }) => {
  const { dispatch } = useIntent();
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document.content });
  const comments = useMemo<Comment[]>(() => {
    return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
  }, [document.comments]);

  useEffect(() => {
    void dispatch({
      action: ThreadAction.SELECT,
    });
  }, [document.id]);

  if (!model) {
    return null;
  }

  return (
    <MainLayout>
      <EditorMain
        model={model}
        comments={comments}
        readonly={readonly}
        editorMode={editorMode}
        extensions={extensions}
      />
    </MainLayout>
  );
};
