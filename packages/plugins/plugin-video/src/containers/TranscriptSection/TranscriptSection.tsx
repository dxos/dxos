//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { Pending, Transcript } from '#components';
import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

// TODO(burdon): Use AppSurface.Section.
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

  // Set the selection point on the shared attention context; VideoSection observes it and moves the
  // player to the corresponding offset (the selection id is the seconds offset).
  const handleSeek = useCallback(
    (seconds: number) => {
      void invokePromise(LayoutOperation.Select, {
        contextId: attendableId,
        subject: { mode: 'single', id: String(Math.max(0, Math.floor(seconds))) },
      });
    },
    [attendableId, invokePromise],
  );

  // Auto-generate the transcript when missing. The `running` ref guards against re-entrancy across the
  // async gap before the reactive `video.transcript` field updates.
  const runningRef = useRef(false);
  const [transcribeFailed, setTranscribeFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    if (!video.url || video.transcript || runningRef.current || !invokePromise) {
      return;
    }
    runningRef.current = true;
    setTranscribeFailed(false);
    void invokePromise(
      VideoOperation.Transcribe,
      { video: Ref.make(subject) },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['transcribe-error.message', { ns: meta.id }] },
      },
    )
      .then(
        () => {
          setTranscribeFailed(false);
        },
        () => {
          setTranscribeFailed(true);
        },
      )
      .finally(() => {
        runningRef.current = false;
      });
  }, [video.url, video.transcript, invokePromise, subject, retryCount]);

  if (!video.transcript) {
    if (transcribeFailed) {
      return (
        <div className='grid place-items-center w-full p-4 text-description gap-2'>
          <span>{t('transcribe-error.message')}</span>
          <Button variant='ghost' onClick={() => setRetryCount((c) => c + 1)}>
            {t('transcribe-retry.label')}
          </Button>
        </div>
      );
    }

    return <Pending label={t('transcribing.pending.label')} />;
  }

  return <Transcript id={`${uri}/transcript`} source={video.transcript} onSeek={handleSeek} />;
};
