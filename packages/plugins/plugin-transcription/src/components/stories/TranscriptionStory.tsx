//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { type Dispatch, type FC, type RefObject, type SetStateAction } from 'react';

import { IconButton, ScrollContainer, Toolbar } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { type SerializationModel } from '../../model';
import { TranscriptView } from '../Transcript';

export const TranscriptionStory: FC<{
  model: SerializationModel<Message.Message>;
  disabled?: boolean;
  running: boolean;
  onRunningChange: Dispatch<SetStateAction<boolean>>;
  audioRef?: RefObject<HTMLAudioElement | null>;
}> = ({ model, running, onRunningChange, audioRef, disabled }) => {
  return (
    <div className='flex flex-col is-[30rem]'>
      {audioRef && <audio ref={audioRef} autoPlay />}
      <Toolbar.Root>
        <IconButton
          iconOnly
          disabled={disabled}
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Play'}
          onClick={() => onRunningChange((running) => !running)}
        />
      </Toolbar.Root>
      <ScrollContainer.Root pin>
        <ScrollContainer.Viewport>
          <TranscriptView model={model} />
        </ScrollContainer.Viewport>
      </ScrollContainer.Root>
    </div>
  );
};
