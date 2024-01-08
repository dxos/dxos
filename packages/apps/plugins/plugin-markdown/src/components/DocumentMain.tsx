//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo, type RefCallback } from 'react';

import { ThreadAction } from '@braneframe/plugin-thread';
import { type Document as DocumentType } from '@braneframe/types';
import { useIntent } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type CommentRange, useTextModel, type TextEditorRef } from '@dxos/react-ui-editor';

import { EditorMain } from './EditorMain';
import type { MarkdownPluginState } from '../MarkdownPlugin';
import { getExtensions } from '../extensions';
import type { MarkdownSettingsProps } from '../types';

export const DocumentMain: FC<{
  document: DocumentType;
  readonly: boolean;
  settings: MarkdownSettingsProps;
  state: MarkdownPluginState;
  pluginRefCallback: RefCallback<TextEditorRef>;
}> = ({ document, readonly, settings, state, pluginRefCallback }) => {
  const { dispatch } = useIntent();
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document.content });
  const comments = useMemo<CommentRange[]>(() => {
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
    <EditorMain
      readonly={readonly}
      editorMode={settings.editorMode}
      model={model}
      comments={comments}
      extensions={getExtensions({
        space,
        document,
        debug: settings.debug,
        experimental: settings.experimental,
        dispatch,
        onChange: (text: string) => {
          state.onChange.forEach((onChange) => onChange(text));
        },
      })}
      properties={document}
      editorRefCb={pluginRefCallback}
    />
  );
};
