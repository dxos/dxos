//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';

import { LevelMeter, formatSeconds } from '#components';
import { RecorderCapabilities } from '#types';

import { useLevel } from '../../hooks/index.ts';
import { RecorderNamespace } from '../../namespace.ts';

export type RecordingOverlayProps = {
  subject: Presentation.Presentation;
};

/**
 * Over a presentation being recorded: the 3-2-1 count-in, then REC, the recording's length, the time left on the
 * slide, and the level meter, so a muted mic (NO SIGNAL) or clipping shows while there is still time to stop.
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
  const { t } = UiHooks.useTranslation(RecorderNamespace.key);
  const state = useAtomValue(recorder.state);
  const recording = state.status === 'recording' && state.presentationId === subject.id;
  const level = useLevel(recording ? recorder.analyser : undefined);
  const now = useNow(recording);
  if (state.status === 'counting' && state.presentationId === subject.id) {
    return (
      <div
        data-testid='recorder.count-in'
        aria-live='assertive'
        className='pointer-events-none dx-cover z-[300] flex items-center justify-center'
      >
        <span className='flex size-40 items-center justify-center rounded-full bg-black/60 font-mono text-8xl text-white'>
          {state.count}
        </span>
      </div>
    );
  }
  if (!recording || state.startedAt === undefined) {
    return null;
  }

  const elapsed = (now - state.startedAt) / 1000;
  const duration = state.slide?.duration;
  const remaining =
    duration === undefined || !state.slide ? undefined : duration - (now - state.slide.startedAt) / 1000;

  return (
    <div
      data-testid='recorder.overlay'
      className='absolute top-4 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-3 rounded-md border border-separator bg-modal-surface px-3 py-1.5 shadow-sm'
    >
      <span className='flex items-center gap-1.5 font-semibold text-error-text'>
        <span className='size-2.5 animate-pulse rounded-full bg-error-text' />
        {t('recording.label')}
      </span>
      <span className='font-mono text-sm'>{formatSeconds(elapsed)}</span>
      {remaining !== undefined && (
        <span
          data-testid='recorder.overlay.remaining'
          data-over={remaining < 0}
          className={mx('font-mono text-sm', remaining < 0 ? 'text-error-text' : 'text-fg-muted')}
        >
          {remaining < 0
            ? t('slide-over.label', { time: formatSeconds(-remaining) })
            : t('slide-remaining.label', { time: formatSeconds(remaining) })}
        </span>
      )}
      <LevelMeter
        peakDb={level?.peakDb}
        holdDb={level?.holdDb}
        rmsDb={level?.rmsDb}
        silent={level?.silent}
        clip={level?.clip}
        compact
      />
    </div>
  );
};

/** `performance.now()`, updated a few times a second while `active`. */
const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    setNow(performance.now());
    const interval = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(interval);
  }, [active]);
  return now;
};
