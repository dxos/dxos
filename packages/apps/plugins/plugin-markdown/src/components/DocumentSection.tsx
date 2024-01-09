//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect } from 'react';

import { ThreadAction } from '@braneframe/plugin-thread';
import { type Document as DocumentType } from '@braneframe/types';
import { useIntent } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTextModel } from '@dxos/react-ui-editor';

import { EditorSection } from './EditorSection';
import { type MarkdownPluginState } from '../MarkdownPlugin';
import { getExtensions } from '../extensions';
import { type MarkdownSettingsProps } from '../types';

export const DocumentSection: FC<{
  document: DocumentType;
  settings: MarkdownSettingsProps;
  state: MarkdownPluginState;
}> = ({ document, settings, state }) => {
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

  return (
    <EditorSection
      editorMode={settings.editorMode}
      model={model}
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
    />
  );
};
