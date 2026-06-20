//
// Copyright 2025 DXOS.org
//

import React, {
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useRef,
} from 'react';

import { IconButton, ScrollContainer, Toolbar } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { Transcription } from '../components';
import { type SerializationModel } from '../model';

export type TranscriptionStoryProps = {
  audioRef?: RefObject<HTMLAudioElement | null>;
  model: SerializationModel<Message.Message>;
  running: boolean;
  disabled?: boolean;
  uploadAccept?: string;
  onRunningChange: Dispatch<SetStateAction<boolean>>;
  onUpload?: (file: File) => void;
};

/**
 * Story wrapper that renders a transcript with playback controls, an optional audio file
 * upload affordance, and a toolbar slot for additional controls.
 *
 * @param onUpload - Callback fired when the user picks a local audio file via the upload button.
 * @param uploadAccept - HTML `accept` filter for the hidden file input. Defaults to `audio/*`.
 */
export const TranscriptionStory = ({
  audioRef,
  model,
  running,
  disabled,
  uploadAccept = 'audio/*',
  onRunningChange,
  onUpload,
}: TranscriptionStoryProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && onUpload) {
        onUpload(file);
      }

      // Reset so the same file can be re-selected.
      event.target.value = '';
    },
    [onUpload],
  );

  return (
    <>
      {audioRef && <audio ref={audioRef} autoPlay />}
      <Toolbar.Root>
        <IconButton
          iconOnly
          disabled={disabled}
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Play'}
          onClick={() => onRunningChange((running) => !running)}
        />
        {onUpload && (
          <>
            <input
              ref={fileInputRef}
              type='file'
              accept={uploadAccept}
              disabled={disabled}
              className='hidden'
              onChange={handleFileChange}
            />
            <IconButton
              iconOnly
              disabled={disabled}
              icon='ph--upload--regular'
              label='Upload audio'
              onClick={() => fileInputRef.current?.click()}
            />
          </>
        )}
      </Toolbar.Root>
      <ScrollContainer.Root pin>
        <ScrollContainer.Content>
          <ScrollContainer.Viewport>
            <Transcription model={model} />
          </ScrollContainer.Viewport>
        </ScrollContainer.Content>
      </ScrollContainer.Root>
    </>
  );
};
