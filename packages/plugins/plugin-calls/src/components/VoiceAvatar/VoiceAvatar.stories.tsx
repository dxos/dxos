//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type VoiceAvatar, type VoiceAvatarVariant, createVoiceAvatar } from '../../calls/voice-avatar.ts';
import { VideoObject } from '../Media/index.ts';

type StoryProps = {
  /** Audio file the avatar speaks. */
  src: string;
  variant?: VoiceAvatarVariant;
};

type Voice = { avatar: VoiceAvatar; audio: HTMLAudioElement; context: AudioContext };

/** The abstract avatar on its own, moving with a voice file that plays through the speakers. */
const VoiceAvatarStory = ({ src, variant }: StoryProps) => {
  const [voice, setVoice] = useState<Voice>();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const context = new AudioContext();
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';
    const source = context.createMediaElementSource(audio);
    const destination = context.createMediaStreamDestination();
    source.connect(destination);
    source.connect(context.destination);
    const avatar = createVoiceAvatar(context, destination.stream.getAudioTracks()[0], {
      variant,
      width: 960,
      height: 540,
    });
    const onEnded = () => setPlaying(false);
    audio.addEventListener('ended', onEnded);
    setVoice({ avatar, audio, context });

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      avatar.close();
      void context.close();
      setPlaying(false);
    };
  }, [src, variant]);

  const handlePlay = async () => {
    if (!voice) {
      return;
    }

    // The click is the gesture the browser needs before the context may produce sound.
    await voice.context.resume();
    voice.audio.currentTime = 0;
    await voice.audio.play();
    setPlaying(true);
  };

  const handleStop = () => {
    voice?.audio.pause();
    setPlaying(false);
  };

  return (
    <div className='relative grid h-full place-items-center'>
      <VideoObject videoStream={voice?.avatar.stream} muted contain classNames='dx-fill rounded-md' />
      {/* Overlaid, so the picture is centred in the whole viewport. */}
      <div className='absolute bottom-4'>
        {playing ? (
          <Button.Root icon='ph--stop--regular' label='Stop' onClick={handleStop} />
        ) : (
          <Button.Root
            variant='primary'
            icon='ph--play--regular'
            label='Speak'
            disabled={!voice}
            onClick={() => void handlePlay().catch((err) => log.catch(err))}
          />
        )}
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/VoiceAvatar',
  render: VoiceAvatarStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The shape a simulated participant with `avatar` shows. Serve the voice at `src` (copy it to `tools/storybook-react/static/simulated-call/` for the default).',
      },
    },
  },
  args: { src: '/simulated-call/agent-voice.webm' },
} satisfies Meta<typeof VoiceAvatarStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Spectrum: Story = {
  args: { variant: 'spectrum' },
};
