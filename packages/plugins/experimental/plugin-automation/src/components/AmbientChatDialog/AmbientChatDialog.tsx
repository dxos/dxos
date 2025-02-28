//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect, useRef } from 'react';

import { log } from '@dxos/log';
import { useAudioTrack, useIsSpeaking, Transcriber, MediaStreamRecorder } from '@dxos/plugin-transcription';
import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/react-ui-theme';

import OFF from '../../../assets/off.wav';
import ON from '../../../assets/on.wav';
import { AUTOMATION_PLUGIN } from '../../meta';
import { Prompt } from '../Prompt';

const playSound = (on?: boolean) => {
  const audio = new Audio(on ? ON : OFF);
  void audio.play().catch((error) => {
    log.error('error playing click sound', { error });
  });
};

const preventDefault = (event: Event) => event.preventDefault();

// TODO(budon): Voice and suggest.

export const AmbientChatDialog = () => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const [size, setSize] = useState<Size>('min-content');
  const [iter, setIter] = useState(0);

  // TODO(burdon): Get acitve space for queue.
  // const space = useSpace();
  // const queueDxn = useMemo(() => {
  //   return space ? new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]) : undefined;
  // }, [space]);

  // Audio/transcription.
  const [active, setActive] = useState(false);
  const track = useAudioTrack(active);
  const isSpeaking = useIsSpeaking(track);

  // Start/stop transcription.
  const transcriberRef = useRef<Transcriber>(null);
  useEffect(() => {
    if (track && active) {
      const init = async () => {
        const transcriber = new Transcriber({
          config: {
            transcribeAfterChunksAmount: 50,
            prefixBufferChunksAmount: 10,
          },
          recorder: new MediaStreamRecorder({
            mediaStreamTrack: track,
            interval: 200,
          }),
          onSegments: async (segments) => {
            log.info('segments', { segments });
          },
        });

        playSound(true);
        await transcriber.open();
        void transcriber?.startChunksRecording();
        log.info('recording...');
      };

      void init();
    } else {
      if (transcriberRef.current) {
        playSound(false);
        log.info('stopping');
        transcriberRef.current?.stopChunksRecording();
        void transcriberRef.current?.close();
        log.info('stopped');
      }
    }
  }, [track, active]);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        onInteractOutside={preventDefault}
        classNames='pointer-events-auto relative overflow-hidden is-[500px] max-is-none'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
      >
        <ResizeHandle
          key={iter}
          side='block-start'
          defaultSize='min-content'
          minSize={5}
          fallbackSize={5}
          iconPosition='center'
          onSizeChange={setSize}
        />

        <div className='flex w-full items-center'>
          <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
          <Dialog.Close>
            <Icon icon='ph--x--regular' size={4} />
          </Dialog.Close>
          <div className='grow' />
          <IconButton
            variant='ghost'
            icon='ph--caret-down--regular'
            iconOnly
            label='Shrink'
            onClick={() => {
              setIter((iter) => iter + 1);
              setSize('min-content');
            }}
          />
        </div>

        <div className='grid grid-cols-[1fr_auto] w-full'>
          <Prompt autoFocus lineWrapping classNames='pt-1' />
          <div className='flex flex-col h-full'>
            <IconButton
              classNames={mx(isSpeaking && 'animate-pulse')}
              icon='ph--microphone--regular'
              iconOnly
              label='Microphone'
              onMouseDown={() => setActive(true)}
              onMouseUp={() => setActive(false)}
            />
          </div>
        </div>
      </Dialog.Content>
    </div>
  );
};
