//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type TranscriptType } from '@dxos/plugin-transcription/types';
import { Toolbar, IconButton, useTranslation } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';

import { useCallGlobalContext } from '../../hooks';
import { MEETING_PLUGIN } from '../../meta';
import { type TranscriptionState } from '../../types';
import { MediaButtons } from '../Media';

export type CallToolbarProps = {
  onTranscription?: () => Promise<ReactiveEchoObject<TranscriptType>>;
};

// TODO(mykola): Move transcription related logic to a separate component.
export const CallToolbar = ({ onTranscription }: CallToolbarProps) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const { call } = useCallGlobalContext();

  // Screen sharing.
  const isScreensharing = call.media.screenshareTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

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
      {onTranscription && (
        <IconButton
          iconOnly
          icon={call.transcription.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'}
          label={call.transcription.enabled ? t('transcription off') : t('transcription on')}
          onClick={handleToggleTranscription}
        />
      )}
      <IconButton
        disabled={!canSharescreen}
        iconOnly
        icon={isScreensharing ? 'ph--broadcast--regular' : 'ph--screencast--regular'}
        label={isScreensharing ? t('screenshare off') : t('screenshare on')}
        classNames={[isScreensharing && 'text-red-500']}
        onClick={
          isScreensharing
            ? () => call.turnScreenshareOff().catch((err) => log.catch(err))
            : () => call.turnScreenshareOn().catch((err) => log.catch(err))
        }
      />
      <IconButton
        iconOnly
        icon={call.raisedHand ? 'ph--hand-waving--regular' : 'ph--hand-palm--regular'}
        label={call.raisedHand ? t('lower hand') : t('raise hand')}
        classNames={[call.raisedHand && 'text-red-500']}
        onClick={() => call.setRaisedHand(!call.raisedHand)}
      />
      <MediaButtons />
    </Toolbar.Root>
  );
};

CallToolbar.displayName = 'CallToolbar';
