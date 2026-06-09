//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';

import { Pending, Transcript } from '#components';
import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

const SYNC_INTERVAL_MS = 10_000;

export type TranscriptSectionProps = {
  subject: Video.Video;
  attendableId: string;
};

/**
 * Section/tabpanel surface that renders the read-only {@link Transcript}, or a pending indicator while
 * the transcript is generated. The transcript is generated on demand when missing.
 */
export const TranscriptSection = ({ attendableId, subject }: TranscriptSectionProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const [video] = useObject(subject);
  const uri = Obj.getURI(subject);

  // Tracks the playback base offset + wall-clock time when the user last seeked. Used by the 10s
  // ticker to estimate current playback position for transcript scrolling.
  const playbackRef = useRef<{ offset: number; startedAt: number } | null>(null);
  const [currentSeconds, setCurrentSeconds] = useState<number | undefined>(undefined);

  // Set the selection point on the shared attention context; VideoSection observes it and moves the
  // player to the corresponding offset (the selection id is the seconds offset).
  const handleSeek = useCallback(
    (seconds: number) => {
      playbackRef.current = { offset: seconds, startedAt: Date.now() };
      void invokePromise(LayoutOperation.Select, {
        contextId: attendableId,
        subject: { mode: 'single', id: String(Math.max(0, Math.floor(seconds))) },
      });
    },
    [attendableId, invokePromise],
  );

  // Periodically estimate the current playback position and update currentSeconds so the transcript
  // can scroll to follow the video. Only runs after the user has seeked at least once.
  useEffect(() => {
    const id = setInterval(() => {
      if (!playbackRef.current) {
        return;
      }
      const { offset, startedAt } = playbackRef.current;
      setCurrentSeconds(offset + (Date.now() - startedAt) / 1000);
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Auto-generate the transcript when missing. The `running` ref guards against re-entrancy across the
  // async gap before the reactive `video.transcript` field updates.
  const runningRef = useRef(false);
  useEffect(() => {
    if (!video.url || video.transcript || runningRef.current || !invokePromise) {
      return;
    }
    runningRef.current = true;
    void invokePromise(
      VideoOperation.Transcribe,
      { video: Ref.make(subject) },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['transcribe-error.message', { ns: meta.id }] },
      },
    ).finally(() => {
      runningRef.current = false;
    });
  }, [video.url, video.transcript, invokePromise, subject]);

  if (!video.transcript) {
    return <Pending label={t('transcribing.pending.label')} />;
  }

  return (
    <Transcript
      id={`${uri}/transcript`}
      source={video.transcript}
      onSeek={handleSeek}
      currentSeconds={currentSeconds}
    />
  );
};

export default TranscriptSection;
