//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';
import { useUnmount } from 'react-use';

import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { Filter, useQuery, type Space } from '@dxos/react-client/echo';

import { Transcription as TranscriptionHandler } from '../../ai';
import { type Ai, type UserMedia } from '../../hooks';
import { type UserState } from '../../types';

const useDocument = ({ space, ai }: { space: Space; ai: Ai }) => {
  const doc = useQuery(space, Filter.schema(DocumentType, { id: ai.transcription.objectId }))[0];

  useEffect(() => {
    if (doc) {
      doc.content.load().catch((err) => log.catch(err));
    }
  }, [doc]);

  return doc;
};

/**
 * Sends last `recordingLength` seconds of audio to the server each `recordingInterval` milliseconds.
 */
export const Transcription = ({
  space,
  userMedia,
  identity,
  ai,
}: {
  space: Space;
  userMedia: UserMedia;
  identity: UserState;
  ai: Ai;
}) => {
  const transcription = useRef<TranscriptionHandler | null>(
    new TranscriptionHandler({
      recordingInterval: 5_000,
      overlap: 0,
    }),
  );

  const doc = useDocument({ space, ai });

  useEffect(() => {
    transcription.current!.setAudioTrack(userMedia.audioTrack);
  }, [userMedia.audioTrack]);

  useEffect(() => {
    transcription.current!.setIdentity(identity);
  }, [identity]);

  useEffect(() => {
    transcription.current!.setDocument(doc);
  }, [doc]);

  // if user is not speaking, stop recording after 5 seconds. if speaking, start recording.
  const stopTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!identity.speaking) {
      stopTimeout.current = setTimeout(() => {
        log.info('stopping recorder');
        transcription.current!.stopRecorder();
      }, 5_000);
    } else {
      log.info('starting recorder');
      transcription.current!.startRecorder();
      if (stopTimeout.current) {
        clearTimeout(stopTimeout.current);
        stopTimeout.current = null;
      }
    }
  }, [identity.speaking]);

  useUnmount(() => {
    transcription.current!.stopRecorder();
  });

  return null;
};
