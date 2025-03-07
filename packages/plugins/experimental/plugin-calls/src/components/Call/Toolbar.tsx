//
// Copyright 2024 DXOS.org
//

import React, { useRef, useEffect, useState, useCallback } from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useTranscriber } from '@dxos/plugin-transcription';
import { TranscriptBlock, type TranscriptType, type TranscriptSegment } from '@dxos/plugin-transcription/types';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { Toolbar, IconButton, useTranslation } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';

import { useCallGlobalContext } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { type TranscriptionState } from '../../types';
import { MediaButtons } from '../Media';

const STOP_TRANSCRIPTION_TIMEOUT = 250;

export type CallToolbarProps = {
  onTranscription?: () => Promise<ReactiveEchoObject<TranscriptType>>;
};

// TODO(mykola): Move transcription related logic to a separate component.
export const CallToolbar = ({ onTranscription }: CallToolbarProps) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const { call } = useCallGlobalContext();

  // Screen sharing.
  const isScreensharing = call.media.screenshareVideoTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // Broadcast status over swarm.
  const [raisedHand, setRaisedHand] = useState(false);

  // Initialize transcriber.
  const edgeClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(
    edgeClient,
    call.transcription.queueDxn ? DXN.parse(call.transcription.queueDxn) : undefined,
  );
  const handleSegments = useCallback(
    async (segments: TranscriptSegment[]) => {
      const block = createStatic(TranscriptBlock, { author: call.self.name, segments });
      queue?.append([block]);
    },
    [queue, call.self.name],
  );

  // TODO(mykola): Move to CallManager.
  const transcriber = useTranscriber({
    audioStreamTrack: call.media.audioTrack,
    onSegments: handleSegments,
  });

  // Turn transcription on and off.
  useEffect(() => {
    if (call.transcription.enabled && transcriber) {
      void transcriber.open();
    } else if (!call.transcription.enabled && transcriber) {
      void transcriber.close();
    }
  }, [call.transcription.enabled, transcriber]);

  // If user is not speaking, stop transcription after STOP_TRANSCRIPTION_TIMEOUT. if speaking, start transcription.
  const disableTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const transcriptionEnabled = call.transcription.enabled;
    log('transcription', {
      enabled: transcriptionEnabled,
      transcriber: !!transcriber,
      isOpen: transcriber?.isOpen,
      speaking: call.speaking,
    });

    if (!transcriptionEnabled) {
      return;
    }

    if (call.speaking) {
      log.info('starting transcription');
      if (disableTimeout.current) {
        clearTimeout(disableTimeout.current);
        disableTimeout.current = null;
      }

      transcriber?.startChunksRecording();
    } else {
      disableTimeout.current = setTimeout(() => {
        log.info('stopping transcription');
        transcriber?.stopChunksRecording();
      }, STOP_TRANSCRIPTION_TIMEOUT);
    }

    return () => {
      if (disableTimeout.current) {
        clearTimeout(disableTimeout.current);
        disableTimeout.current = null;
      }
    };
  }, [call.transcription.enabled, transcriber, transcriber?.isOpen, call.speaking]);

  const leaveSound = useSoundEffect('LeaveCall');
  const handleLeave = () => {
    void call.turnScreenshareOff();
    void call.leave();
    void leaveSound.play();
  };

  const handleToggleTranscription = async () => {
    const newTranscription: TranscriptionState = { enabled: !call.transcription.enabled };
    if (newTranscription.enabled && !call.transcription.queueDxn) {
      const object = await onTranscription?.();
      if (object?.queue) {
        newTranscription.queueDxn = object.queue;
      }
    }
    call.setTranscription(newTranscription);
  };

  return (
    <Toolbar.Root>
      <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={handleLeave} />
      <div className='grow'></div>
      {/* TODO(burdon): Capability test. */}
      <IconButton
        iconOnly
        icon={call.transcription.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'}
        label={call.transcription.enabled ? t('transcription off') : t('transcription on')}
        onClick={handleToggleTranscription}
      />
      <IconButton
        disabled={!canSharescreen}
        iconOnly
        icon={isScreensharing ? 'ph--broadcast--regular' : 'ph--screencast--regular'}
        label={isScreensharing ? t('screenshare off') : t('screenshare on')}
        classNames={[isScreensharing && 'text-red-500']}
        onClick={isScreensharing ? call.turnScreenshareOff : call.turnScreenshareOn}
      />
      <IconButton
        iconOnly
        icon={raisedHand ? 'ph--hand-waving--regular' : 'ph--hand-palm--regular'}
        label={raisedHand ? t('lower hand') : t('raise hand')}
        classNames={[raisedHand && 'text-red-500']}
        onClick={() => setRaisedHand((raisedHand) => !raisedHand)}
      />
      <MediaButtons />
    </Toolbar.Root>
  );
};

CallToolbar.displayName = 'CallToolbar';
