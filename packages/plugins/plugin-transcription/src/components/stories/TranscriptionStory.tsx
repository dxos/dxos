//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { type Dispatch, type FC, type RefObject, type SetStateAction } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
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
  const space = useSpace();

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
          <TranscriptView space={space} model={model} />
        </ScrollContainer.Viewport>
      </ScrollContainer.Root>
    </div>
  );
};
