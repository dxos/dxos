//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, {
  type ChangeEvent,
  type Dispatch,
  type FC,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useRef,
} from 'react';

import { IconButton, ScrollContainer, Toolbar } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { Transcription } from '../components';
import { type SerializationModel } from '../model';

/**
 * Story wrapper that renders a transcript with playback controls, an optional audio file
 * upload affordance, and a toolbar slot for additional controls.
 *
 * @param onUpload - Callback fired when the user picks a local audio file via the upload button.
 * @param uploadAccept - HTML `accept` filter for the hidden file input. Defaults to `audio/*`.
 * @param toolbarSlot - Extra content rendered after the upload button inside the toolbar.
 */
export const TranscriptionStory: FC<{
  model: SerializationModel<Message.Message>;
  disabled?: boolean;
  running: boolean;
  onRunningChange: Dispatch<SetStateAction<boolean>>;
  audioRef?: RefObject<HTMLAudioElement | null>;
  onUpload?: (file: File) => void;
  uploadAccept?: string;
  toolbarSlot?: ReactNode;
}> = ({ model, running, onRunningChange, audioRef, disabled, onUpload, uploadAccept = 'audio/*', toolbarSlot }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset so the same file can be re-selected.
    event.target.value = '';
  };

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
        {toolbarSlot}
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
