//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { log } from '@dxos/log';
import * as StatusBar from '@dxos/plugin-status-bar/StatusBar';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { appDisplayName } from '#recorder';
import { MeetingRecorderCapabilities, MeetingRecorderOperation } from '#types';

import { MeetingRecorderNamespace } from '../namespace.ts';

/** `m:ss`, or `h:mm:ss` past an hour. */
export const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};

const useElapsed = (startedAt: number | undefined): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === undefined) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return startedAt === undefined ? 0 : now - startedAt;
};

/**
 * The recorder's place in the status bar, standing in for Granola's menu-bar item: a record button
 * when idle, the detected meeting with a "Take notes" action, and the running timer with Stop.
 */
export const RecorderStatus = () => {
  const { t } = UiHooks.useTranslation(MeetingRecorderNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const state = Hooks.useOptionalAtomCapability(MeetingRecorderCapabilities.State) ?? { phase: 'idle' as const };
  const elapsed = useElapsed(state.phase === 'recording' ? state.startedAt : undefined);

  const run = useCallback((promise: Promise<unknown>) => {
    void promise.catch((err) => log.catch(err));
  }, []);
  const handleStart = useCallback(
    () =>
      run(invokePromise(MeetingRecorderOperation.Start, { app: state.phase === 'detected' ? state.app : undefined })),
    [run, invokePromise, state],
  );
  const handleStop = useCallback(() => run(invokePromise(MeetingRecorderOperation.Stop, {})), [run, invokePromise]);
  const handleDismiss = useCallback(
    () => run(invokePromise(MeetingRecorderOperation.ClearDetection, {})),
    [run, invokePromise],
  );

  switch (state.phase) {
    case 'idle':
      return (
        <StatusBar.Item>
          <Button.Root
            variant='ghost'
            icon='ph--record--regular'
            iconOnly
            label={t('record-meeting.label')}
            onClick={handleStart}
            data-testid='meetingRecorder.record'
          />
        </StatusBar.Item>
      );

    case 'detected':
      return (
        <StatusBar.Item>
          <Layout.Flex column align='center'>
            <Button.Root
              variant='ghost'
              icon='ph--record--fill'
              iconOnly
              iconClassNames='text-error-text animate-pulse'
              label={t('take-notes-for.label', { app: appDisplayName(state.app) })}
              onClick={handleStart}
              data-testid='meetingRecorder.takeNotes'
            />
            <Button.Root
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('dismiss.label')}
              onClick={handleDismiss}
              data-testid='meetingRecorder.dismiss'
            />
          </Layout.Flex>
        </StatusBar.Item>
      );

    case 'starting':
    case 'stopping':
      return (
        <StatusBar.Item>
          <Button.Root
            variant='ghost'
            icon='ph--spinner--regular'
            iconOnly
            spin
            disabled
            label={t(state.phase === 'starting' ? 'starting.label' : 'stopping.label')}
            data-testid='meetingRecorder.busy'
          />
        </StatusBar.Item>
      );

    case 'recording':
      return (
        <StatusBar.Item>
          {/* The status rail is one icon wide, so the timer sits under the button rather than in its label. */}
          <Layout.Flex column align='center'>
            <Button.Root
              variant='ghost'
              icon='ph--stop-circle--fill'
              iconOnly
              iconClassNames='text-error-text animate-pulse'
              label={t('recording.label', {
                elapsed: formatElapsed(elapsed),
                source: state.app ? appDisplayName(state.app) : t('microphone.label'),
              })}
              onClick={handleStop}
              data-testid='meetingRecorder.stop'
            />
            <StatusBar.Text classNames='text-xs text-error-text tabular-nums'>{formatElapsed(elapsed)}</StatusBar.Text>
          </Layout.Flex>
        </StatusBar.Item>
      );
  }
};
