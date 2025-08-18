//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { type Dispatch, type FC, type RefObject, type SetStateAction } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { type DataType } from '@dxos/schema';

import { type SerializationModel } from '../../model';
import { Transcript } from '../Transcript';

export const TranscriptionStory: FC<{
  model: SerializationModel<DataType.Message>;
  running: boolean;
  onRunningChange: Dispatch<SetStateAction<boolean>>;
  audioRef?: RefObject<HTMLAudioElement>;
}> = ({ model, running, onRunningChange, audioRef }) => {
  const space = useSpace();

  return (
    <div className='flex flex-col w-[30rem]'>
      {audioRef && <audio ref={audioRef} autoPlay />}
      <Toolbar.Root>
        <IconButton
          iconOnly
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Play'}
          onClick={() => onRunningChange((running) => !running)}
        />
      </Toolbar.Root>
      <ScrollContainer.Root pin>
        <ScrollContainer.Content>
          <Transcript space={space} model={model} attendableId='story' />
        </ScrollContainer.Content>
      </ScrollContainer.Root>
    </div>
  );
};
