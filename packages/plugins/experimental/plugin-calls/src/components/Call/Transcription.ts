//
// Copyright 2025 DXOS.org
//

import { useEffect, useRef } from 'react';

import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { Filter, updateText, type Space } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';

import { type Ai, type UserMedia } from '../../hooks';
import { CALLS_URL, type UserState } from '../../types';

const useDocument = ({ space, ai }: { space: Space; ai: Ai }) => {
  const document = useRef<DocumentType | null>();

  useAsyncEffect(async () => {
    log.info('>>> useDocument', { objectId: ai.transcription.objectId });
    if (!document.current && ai.transcription.objectId) {
      document.current = (await space.db.query(Filter.schema(DocumentType, { id: ai.transcription.objectId })).run())
        .objects[0] as DocumentType;
      log.info('>>> useDocument.queryDocument', { document: document.current, objectId: ai.transcription.objectId });
    }
  }, [ai.transcription.objectId]);

  return document;
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
  const audioTrack = userMedia.audioTrack;
  const config = {
    /**
     * How much overlap between chunks.
     */
    overlap: 2,

    /**
     * How often to send the last `recordingLength` seconds of audio to the server.
     */
    recordingInterval: 10_000, // [ms]
  };

  const document = useDocument({ space, ai });

  const recorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<{ data: Blob; timestamp: number }[]>([]);
  const header = useRef<Uint8Array | null>(null);
  const lastWordEndTimestamp = useRef<number>(Date.now());
  useEffect(() => {
    if (!recorder.current) {
      recorder.current = new MediaRecorder(new MediaStream([audioTrack]));
    }

    recorder.current.ondataavailable = async (event) => {
      try {
        const now = Date.now();
        log.info('>>> ondataavailable', { size: event.data.size });
        if (!header.current && event.data.size >= 181) {
          header.current = new Uint8Array((await event.data.arrayBuffer()).slice(0, 181));
        }
        if (event.data.size > 0) {
          audioChunks.current.push({ data: event.data, timestamp: now });
        }

        if (!document.current) {
          log.info('No document to update');
          return;
        }

        const chunksToUse = audioChunks.current;

        if (chunksToUse.length === 0) {
          log.info('No chunks to send for transcribing');
          return;
        }

        const audio = new Blob([header.current!, ...chunksToUse.map(({ data }) => data)]);

        if (audio.size === 0) {
          log.info('No audio to send for transcribing');
          audioChunks.current = [];
          return;
        }

        log.info('Sending chunks to transcribe', { chunksToUse, audio });
        const response = await fetch(`${CALLS_URL}/transcribe`, {
          method: 'POST',
          body: audio,
        });

        if (!response.ok) {
          log.error('Failed to transcribe', { response });
          audioChunks.current = [];
          return;
        }

        type Word = {
          word: string;
          start: number;
          end: number;
        };
        const {
          words,
        }: {
          text?: string;
          words?: Word[] | Word;
        } = await response.json();

        log.info('>>> transcription response', {
          words,
          string: Array.isArray(words) ? words?.map((word) => word.word).join(' ') : words?.word,
        });

        if (!Array.isArray(words)) {
          return;
        }

        const wordsToUse = words.filter(
          (word) => word.start * 1000 + chunksToUse.at(0)!.timestamp > lastWordEndTimestamp.current,
        );

        lastWordEndTimestamp.current = (wordsToUse.at(-1)?.end ?? 0) * 1000 + chunksToUse.at(0)!.timestamp;
        const textToUse = wordsToUse?.map((word) => word.word).join(' ') + '';
        log.info('>>> textToUse', { textToUse });

        const time = new Date(chunksToUse.at(0)!.timestamp).toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour12: true,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        });
        updateText(
          document.current!.content.target!,
          ['content'],
          document.current!.content.target!.content + `\n   _${time} ${identity.name}_\n` + textToUse,
        );
        audioChunks.current = audioChunks.current.slice(-config.overlap);
      } catch (error) {
        log.error('Error in transcription', { error });
      }
    };

    recorder.current!.start(config.recordingInterval);

    return () => {
      recorder.current!.ondataavailable = null;
      recorder.current?.stop();
      recorder.current = null;
    };
  }, [audioTrack]);
  return null;
};
