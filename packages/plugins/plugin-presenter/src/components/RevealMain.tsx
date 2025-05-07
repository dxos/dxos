//
// Copyright 2023 DXOS.org
//
import { pipe } from 'effect';
import React, { type FC, useCallback } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { DeckAction } from '@dxos/plugin-deck/types';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { RevealPlayer } from './RevealPlayer';

const PresenterMain: FC<{ document: DocumentType }> = ({ document }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleExit = useCallback(() => {
    const documentId = fullyQualifiedId(document);
    return dispatch(
      pipe(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [documentId],
          options: { workspace: getSpace(document)?.id },
        }),
        chain(DeckAction.Adjust, {
          type: 'solo--fullscreen',
          id: documentId,
        }),
      ),
    );
  }, [dispatch, document]);

  return (
    <StackItem.Content>
      <RevealPlayer content={document.content.target?.content ?? ''} onExit={handleExit} />
    </StackItem.Content>
  );
};

export default PresenterMain;
