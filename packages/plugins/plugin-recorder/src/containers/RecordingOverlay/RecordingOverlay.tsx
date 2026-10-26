//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { LevelMeter, formatSeconds } from '#components';
import { meta } from '#meta';
import { RecorderCapabilities } from '#types';

import { useLevel } from '../../hooks/index.ts';

export type RecordingOverlayProps = {
  subject: Presentation.Presentation;
};

/**
 * Over a presentation being recorded: REC, the take's length and the level meter, so a muted mic (NO SIGNAL) or
 * clipping shows while there is still time to stop.
 */
export const RecordingOverlay = ({ subject }: RecordingOverlayProps) => {
  const recorder = Hooks.useOptionalCapability(RecorderCapabilities.Recorder);
  return recorder ? <RecordingOverlayInner subject={subject} recorder={recorder} /> : null;
};

RecordingOverlay.displayName = 'RecordingOverlay';

const RecordingOverlayInner = ({
  subject,
  recorder,
}: RecordingOverlayProps & { recorder: RecorderCapabilities.Recorder }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const state = useAtomValue(recorder.state);
  const recording = state.status === 'recording' && state.presentationId === subject.id;
  const level = useLevel(recording ? recorder.analyser : undefined);
  const elapsed = useTakeTime(recording ? state.startedAt : undefined);
  if (!recording) {
    return null;
  }

  return (
    <div
      data-testid='recorder.overlay'
      className='absolute top-4 left-4 z-[300] flex items-center gap-3 rounded-md border border-separator bg-modal-surface px-3 py-1.5 shadow-sm'
    >
      <span className='flex items-center gap-1.5 font-semibold text-error-text'>
        <span className='size-2.5 animate-pulse rounded-full bg-error-text' />
        {t('recording.label')}
      </span>
      <span className='font-mono text-sm'>{formatSeconds(elapsed)}</span>
      <LevelMeter
        peakDb={level?.peakDb}
        holdDb={level?.holdDb}
        rmsDb={level?.rmsDb}
        silent={level?.silent}
        clip={level?.clip}
      />
    </div>
  );
};

/** Seconds since `startedAt` (a `performance.now()` time), updated twice a second. */
const useTakeTime = (startedAt: number | undefined): number => {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (startedAt === undefined) {
      return;
    }
    const interval = setInterval(() => setNow(performance.now()), 500);
    return () => clearInterval(interval);
  }, [startedAt]);
  return startedAt === undefined ? 0 : Math.max(0, (now - startedAt) / 1000);
};
