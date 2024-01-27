//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import { ThreadAction } from '@braneframe/plugin-thread';
import { type Document as DocumentType } from '@braneframe/types';
import { useIntent } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Extension, useTextModel } from '@dxos/react-ui-editor';

import EditorSection from './EditorSection';
import { type MarkdownSettingsProps } from '../types';

const DocumentSection: FC<{
  document: DocumentType;
  editorMode: MarkdownSettingsProps['editorMode'];
  extensions: Extension[];
}> = ({ document, editorMode, extensions }) => {
  const { dispatch } = useIntent();
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document?.content });
  useEffect(() => {
    void dispatch({
      action: ThreadAction.SELECT,
    });
  }, [document.id]);

  if (!model) {
    return null;
  }

  return <EditorSection editorMode={editorMode} model={model} extensions={extensions} />;
};

export default DocumentSection;

export type DocumentSection = typeof DocumentSection;
