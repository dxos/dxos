//
// Copyright 2024 DXOS.org
//

import React, { useRef, useEffect, useState, useCallback } from 'react';

import { createStatic } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { useTranscriber } from '@dxos/plugin-transcription';
import { TranscriptBlock, type TranscriptSegment } from '@dxos/plugin-transcription/types';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { Toolbar, IconButton, useTranslation } from '@dxos/react-ui';

import { useCallContext, useBroadcastStatus } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { MediaButtons } from '../Media';

const STOP_TRANSCRIPTION_TIMEOUT = 250;

// TODO(mykola): Move transcription related logic to a separate component.
export const CallToolbar = () => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const {
    call: { user: self, transcription, updateUserState },
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    setJoined,
    onTranscription,
  } = useCallContext();

  // Screen sharing.
  const isScreensharing = userMedia.screenshareVideoTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // Broadcast status over swarm.
  const [raisedHand, setRaisedHand] = useState(false);
  useBroadcastStatus({
    peer,
    user: self,
    userMedia,
    pushedTracks,
    raisedHand,
    speaking: isSpeaking,
    transcription: transcription.state.value,
    onUpdateUserState: updateUserState,
  });

  // Initialize transcriber.
  const edgeClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(
    edgeClient,
    transcription.state.value.queueDxn ? DXN.parse(transcription.state.value.queueDxn) : undefined,
  );
  const handleSegments = useCallback(
    async (segments: TranscriptSegment[]) => {
      const block = createStatic(TranscriptBlock, { author: self.name, segments });
      queue?.append([block]);
    },
    [queue, self.name],
  );
  const transcriber = useTranscriber({
    audioStreamTrack: userMedia.audioTrack,
    onSegments: handleSegments,
  });

  // Turn transcription on and off.
  useEffect(() => {
    if (transcription.state.value.enabled && transcriber) {
      void transcriber.open();
    } else if (!transcription.state.value.enabled && transcriber) {
      void transcriber.close();
    }
  }, [transcription.state.value.enabled, transcriber]);

  // If user is not speaking, stop transcription after STOP_TRANSCRIPTION_TIMEOUT. if speaking, start transcription.
  const disableTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const transcriptionEnabled = transcription.state.value.enabled;
    log('transcription', {
      enabled: transcriptionEnabled,
      transcriber: !!transcriber,
      isOpen: transcriber?.isOpen,
      isSpeaking,
    });

    if (!transcriptionEnabled) {
      return;
    }

    if (isSpeaking) {
      log.info('starting transcription');
      if (disableTimeout.current) {
        clearTimeout(disableTimeout.current);
        disableTimeout.current = null;
      }

      transcriber?.startChunksRecording();
    } else {
      disableTimeout.current = setTimeout(() => {
        log.info('stopping transcription', { transcriber });
        transcriber?.stopChunksRecording();
      }, STOP_TRANSCRIPTION_TIMEOUT);
    }

    return () => {
      if (disableTimeout.current) {
        clearTimeout(disableTimeout.current);
        disableTimeout.current = null;
      }
    };
  }, [transcription.state.value.enabled, transcriber, transcriber?.isOpen, isSpeaking]);

  const handleLeave = () => {
    userMedia.turnScreenshareOff();
    setJoined(false);
  };

  const handleToggleTranscription = async () => {
    transcription.setEnabled(!transcription.state.value.enabled);
    if (transcription.state.value.enabled && !transcription.state.value.queueDxn) {
      const object = await onTranscription?.();
      if (object?.queue) {
        transcription.setQueue(DXN.parse(object.queue));
      }
    }
  };

  return (
    <Toolbar.Root>
      <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={handleLeave} />
      <div className='grow'></div>
      {/* TODO(burdon): Capability test. */}
      <IconButton
        iconOnly
        icon={transcription.state.value.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'}
        label={transcription.state.value.enabled ? t('transcription off') : t('transcription on')}
        onClick={handleToggleTranscription}
      />
      <IconButton
        disabled={!canSharescreen}
        iconOnly
        icon={isScreensharing ? 'ph--broadcast--regular' : 'ph--screencast--regular'}
        label={isScreensharing ? t('screenshare off') : t('screenshare on')}
        classNames={[isScreensharing && 'text-red-500']}
        onClick={isScreensharing ? userMedia.turnScreenshareOff : userMedia.turnScreenshareOn}
      />
      <IconButton
        iconOnly
        icon={raisedHand ? 'ph--hand-waving--regular' : 'ph--hand-palm--regular'}
        label={raisedHand ? t('lower hand') : t('raise hand')}
        classNames={[raisedHand && 'text-red-500']}
        onClick={() => setRaisedHand((raisedHand) => !raisedHand)}
      />
      <MediaButtons userMedia={userMedia} />
    </Toolbar.Root>
  );
};

CallToolbar.displayName = 'CallToolbar';
