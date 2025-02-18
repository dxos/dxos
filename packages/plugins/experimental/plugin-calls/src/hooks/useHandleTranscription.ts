//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { LayoutAction, chain, useIntentDispatcher, createIntent } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { MarkdownAction, type DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';

import { useRoomContext } from './useRoomContext';
import { type Transcription as TranscriptionType } from '../types';
import { getTimeStr } from '../utils';

export const useHandleTranscription = () => {
  const {
    space,
    room: { ai },
  } = useRoomContext();
  const { dispatchPromise } = useIntentDispatcher();
  const transcriptionFolder = space.properties[CollectionType.typename]?.target;
  const handleTranscription = async () => {
    const newTranscription: TranscriptionType = {
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
            chain(SpaceAction.AddObject, { target: transcriptionFolder }),
          ),
        )
      ).data!.object as DocumentType;
      log.info('open document', {
        result: await dispatchPromise(
          createIntent(LayoutAction.Open, {
            part: 'main',
            subject: [`${space.id}:${document.id}`],
          }),
        ),
      });
      newTranscription.objectId = document.id;
    }
    ai.setTranscription(newTranscription);
  };

  return {
    onClick: handleTranscription,
    disabled: !transcriptionFolder,
    icon: ai.transcription.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular',
    label: ai.transcription.enabled ? 'Transcription' : 'Transcription Off',
  };
};
