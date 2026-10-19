//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { useArgs } from 'storybook/preview-api';

import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import {
  DEFAULT_TUNING,
  TUNING_PRESETS,
  type VoiceAvatar,
  type VoiceAvatarTuning,
  type VoiceAvatarVariant,
  createVoiceAvatar,
} from '../../calls/voice-avatar.ts';
import { Lobby } from '../Lobby/index.ts';
import { VideoObject } from '../Media/index.ts';
import { ResponsivePanel } from '../ResponsiveGrid/index.ts';

type StoryProps = {
  /** Audio file the avatar speaks. */
  src: string;
  variant?: VoiceAvatarVariant;
} & Partial<VoiceAvatarTuning>;

/** Slider range of each tuning value; Randomize draws from the same ranges. */
const RANGES: Record<keyof VoiceAvatarTuning, { min: number; max: number; step: number }> = {
  waveAmplitude: { min: 0, max: 4, step: 0.1 },
  jitter: { min: 0, max: 4, step: 0.1 },
  waveSpeed: { min: 0, max: 5, step: 0.1 },
  particles: { min: 0, max: 60, step: 1 },
  strands: { min: 1, max: 8, step: 1 },
  separation: { min: 0, max: 0.2, step: 0.005 },
  thickness: { min: 0, max: 3, step: 0.1 },
};

/** A value on the range's step grid, rounded so the slider and the log show it cleanly. */
const randomIn = ({ min, max, step }: { min: number; max: number; step: number }) =>
  Number((min + Math.round((Math.random() * (max - min)) / step) * step).toFixed(3));

type Voice = { avatar: VoiceAvatar; audio: HTMLAudioElement; context: AudioContext };

/** The abstract avatar on its own, moving with a voice file that plays through the speakers. */
const VoiceAvatarStory = ({
  src,
  variant,
  onTune,
  ...tuning
}: StoryProps & {
  /** Writes tuning back to the story's args, so the sliders follow. */
  onTune?: (tuning: VoiceAvatarTuning) => void;
}) => {
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

  // Tuning applies to the running avatar, so moving a slider does not restart it.
  const { waveAmplitude, jitter, waveSpeed, particles, strands, separation, thickness } = tuning;
  useEffect(() => {
    voice?.avatar.tune(
      Object.fromEntries(
        Object.entries({ waveAmplitude, jitter, waveSpeed, particles, strands, separation, thickness }).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    );
  }, [voice, waveAmplitude, jitter, waveSpeed, particles, strands, separation, thickness]);

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

  // Sets the sliders to random values, so a good combination can be read back from the console and kept.
  const handleRandomize = () => {
    const values: VoiceAvatarTuning = {
      waveAmplitude: randomIn(RANGES.waveAmplitude),
      jitter: randomIn(RANGES.jitter),
      waveSpeed: randomIn(RANGES.waveSpeed),
      particles: randomIn(RANGES.particles),
      strands: randomIn(RANGES.strands),
      separation: randomIn(RANGES.separation),
      thickness: randomIn(RANGES.thickness),
    };
    log.info('voice avatar tuning', values);
    onTune?.(values);
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
            <Button.Root icon='ph--shuffle--regular' label='Randomize' onClick={handleRandomize} />
          </Toolbar.Root>
        </Layout.Flex>
      </Layout.Flex>
    </Lobby.Root>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/VoiceAvatar',
  // Storybook's hooks run only in the story function, not in the component it renders, so the args are wired here.
  render: (args) => {
    const [, updateArgs] = useArgs<StoryProps>();
    return <VoiceAvatarStory {...args} onTune={updateArgs} />;
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "The shape a simulated participant with `avatar` shows. Serve the voice at `src`; the default is made with `say -v Daniel -r 150 -o voice.aiff \"I'm sorry, Dave. I'm afraid I can't do that.\"`, converted with `ffmpeg -i voice.aiff -c:a libopus agent-voice.webm` into `tools/storybook-react/static/simulated-call/`.",
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['torus', 'spectrum', 'ink', 'ink-line'] satisfies VoiceAvatarVariant[] },
    ...Object.fromEntries(
      Object.entries(RANGES).map(([key, range]) => [key, { control: { type: 'range', ...range } }]),
    ),
  },
  args: { src: '/simulated-call/agent-voice.webm', variant: 'ink', ...DEFAULT_TUNING },
} satisfies Meta<typeof VoiceAvatarStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Heptapod: Story = {
  args: { variant: 'ink', ...TUNING_PRESETS.heptapod },
};

export const Etching: Story = {
  args: { variant: 'ink', ...TUNING_PRESETS.etching },
};
