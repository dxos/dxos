//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import React from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type DocumentType, MarkdownAction } from '@dxos/plugin-markdown/types';
import { SpaceAction, CollectionType } from '@dxos/plugin-space/types';
import { Button, Icon } from '@dxos/react-ui';

import { useRoomContext } from '../../hooks';
import { type Transcription } from '../../types';
import { getTimeStr } from '../../utils';

export const TranscriptionButton = () => {
  const { dispatchPromise } = useIntentDispatcher();
  const {
    room: { ai },
    space,
  } = useRoomContext();
  return (
    <Button
      variant='default'
      onClick={async () => {
        const newTranscription: Transcription = {
          ...ai.transcription,
          enabled: !ai.transcription.enabled,
          lamportTimestamp: ai.transcription.lamportTimestamp! + 1,
        };
        let document: DocumentType | undefined;
        if (!ai.transcription.enabled && !ai.transcription.objectId) {
          document = (
            await dispatchPromise(
              pipe(
                createIntent(MarkdownAction.Create, { name: 'Transcription ' + getTimeStr() }),
                chain(SpaceAction.AddObject, { target: space.properties[CollectionType.typename]!.target }),
              ),
            )
          ).data!.object as DocumentType;
          newTranscription.objectId = document.id;
        }
        ai.setTranscription(newTranscription);
      }}
    >
      <Icon icon={ai.transcription.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'} />
    </Button>
  );
};
