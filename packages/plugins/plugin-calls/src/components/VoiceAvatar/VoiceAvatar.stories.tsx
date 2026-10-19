//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type VoiceAvatar, type VoiceAvatarVariant, createVoiceAvatar } from '../../calls/voice-avatar.ts';
import { Lobby } from '../Lobby/index.ts';
import { VideoObject } from '../Media/index.ts';
import { ResponsivePanel } from '../ResponsiveGrid/index.ts';

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
    <Lobby.Root>
      <Layout.Grid classNames='grow p-4'>
        <ResponsivePanel>
          <VideoObject videoStream={voice?.avatar.stream} muted classNames='rounded-md' />
        </ResponsivePanel>
      </Layout.Grid>
      <Layout.Flex justify='center' classNames='absolute bottom-0 left-0 right-0'>
        <Layout.Flex justify='center' classNames='z-20 m-8'>
          <Toolbar.Root classNames='p-2 dx-modal-surface rounded-md shadow-md'>
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
          </Toolbar.Root>
        </Layout.Flex>
      </Layout.Flex>
    </Lobby.Root>
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
  argTypes: {
    variant: { control: 'select', options: ['torus', 'spectrum'] satisfies VoiceAvatarVariant[] },
  },
  args: { src: '/simulated-call/agent-voice.webm', variant: 'spectrum' },
} satisfies Meta<typeof VoiceAvatarStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
