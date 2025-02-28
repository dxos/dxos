//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect, useCallback } from 'react';

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type TranscriberParams, useAudioTrack, useTranscriber } from '@dxos/plugin-transcription';
import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/react-ui-theme';

import ON from '../../../assets/click.wav';
import OFF from '../../../assets/off.wav';
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

  const [prompt, setPrompt] = useState('');

  // TODO(burdon): Get acitve space for queue.
  // const space = useSpace();
  // const queueDxn = useMemo(() => {
  //   return space ? new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, space.id, ObjectId.random()]) : undefined;
  // }, [space]);

  // Audio/transcription.
  // TODO(mykola): Do not recreate track on every state change. Or make it possible to substitute track in transcriber.
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const track = useAudioTrack(active);

  // Transcriber.
  const handleSegments = useCallback<TranscriberParams['onSegments']>(async (segments) => {
    const text = segments.map((str) => str.text.trim().replace(/[^\w\s]/g, '')).join(' ');
    setPrompt(text);
  }, []);
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
  });

  // Start/stop transcription.
  useEffect(() => {
    const ctx = new Context();
    scheduleMicroTask(ctx, async () => {
      if (active && transcriber) {
        await transcriber.open();
        log.info('starting...');
        setRecording(true);
        playSound(true);
        transcriber.startChunksRecording();
      } else if (!active && transcriber?.isOpen) {
        transcriber?.stopChunksRecording();
        await transcriber?.close();
        log.info('stopped');
        setRecording(false);
        playSound(false);
      }
    });

    return () => {
      void ctx.dispose();
    };
  }, [active, transcriber]);

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
          <Prompt autoFocus lineWrapping classNames='pt-1' value={prompt} onChange={setPrompt} />
          <div className='flex flex-col h-full'>
            <IconButton
              classNames={mx(recording && 'bg-primary-500')}
              icon='ph--microphone--regular'
              iconOnly
              noTooltip
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
