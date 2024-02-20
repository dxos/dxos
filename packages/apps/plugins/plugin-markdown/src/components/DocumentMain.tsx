//
// Copyright 2024 DXOS.org
//

import React, { type FC, useEffect, useMemo } from 'react';

import { type Document as DocumentType } from '@braneframe/types';
import { LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type Comment, useTextModel } from '@dxos/react-ui-editor';

import EditorMain, { type EditorMainProps } from './EditorMain';

const DocumentMain: FC<{ document: DocumentType } & Pick<EditorMainProps, 'toolbar' | 'readonly' | 'extensions'>> = ({
  document,
  ...props
}) => {
  const identity = useIdentity();
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document.content });
  const dispatch = useIntentDispatcher();
  const comments = useMemo<Comment[]>(() => {
    return document.comments?.map((comment) => ({ id: comment.thread!.id, cursor: comment.cursor! }));
  }, [document.comments]);

  if (!model) {
    return null;
  }

  const hasComments = comments.length > 0;

  // TODO(thure): once Deck is available, this should be refactored so the plugin responsible for related content can
  //   handle its own rendering.
  useEffect(() => {
    if (hasComments) {
      void dispatch({
        action: LayoutAction.SET_LAYOUT,
        data: { element: 'complementary', subject: document, state: true },
      });
    }
    return () => {
      void dispatch({
        action: LayoutAction.SET_LAYOUT,
        data: { element: 'complementary', subject: null, state: false },
      });
    };
  }, [document.id, hasComments]);

  return <EditorMain model={model} comments={comments} {...props} />;
};

export default DocumentMain;

export type DocumentMain = typeof DocumentMain;
