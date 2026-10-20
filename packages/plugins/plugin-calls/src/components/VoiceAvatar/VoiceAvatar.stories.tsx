//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useControls } from 'leva';
import React, { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
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
  variant: VoiceAvatarVariant;
};

/** Paper and ink of the ink variants, tuned beside the motion. */
type Colors = { background: string; ink: string };

const DEFAULT_COLORS: Colors = { background: '#e9e7e2', ink: '#151515' };

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

/** The toolbar's presets: the default look, each tuning preset, and the navy stand-in look. */
const PRESETS: Record<string, VoiceAvatarTuning & Partial<Colors>> = {
  default: DEFAULT_TUNING,
  ...Object.fromEntries(Object.entries(TUNING_PRESETS).map(([name, tuning]) => [name, tuning])),
  navy: { ...TUNING_PRESETS.scribble, background: '#26406b', ink: '#f1ede4' },
};

const PRESET_ITEMS = Object.keys(PRESETS).map((name) => ({ value: name, label: name }));

/** A value on the range's step grid, rounded so the slider and the log show it cleanly. */
const randomIn = ({ min, max, step }: { min: number; max: number; step: number }) =>
  Number((min + Math.round((Math.random() * (max - min)) / step) * step).toFixed(3));

const isInk = (variant: VoiceAvatarVariant) => variant.startsWith('ink');

type Voice = { avatar: VoiceAvatar; audio: HTMLAudioElement; context: AudioContext };

/**
 * One avatar type, moving with a voice file that plays through the speakers. Its parameters are tuned live in the
 * Leva panel (a folder per type, since Leva's store is shared across stories); the toolbar picks a preset.
 */
const VoiceAvatarStory = ({ src, variant }: StoryProps) => {
  const [voice, setVoice] = useState<Voice>();
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState('default');

  const [{ background, ink, ...tuning }, setValues] = useControls(
    variant,
    () => ({
      waveAmplitude: { value: DEFAULT_TUNING.waveAmplitude, ...RANGES.waveAmplitude },
      jitter: { value: DEFAULT_TUNING.jitter, ...RANGES.jitter },
      waveSpeed: { value: DEFAULT_TUNING.waveSpeed, ...RANGES.waveSpeed },
      particles: { value: DEFAULT_TUNING.particles, ...RANGES.particles },
      strands: { value: DEFAULT_TUNING.strands, ...RANGES.strands },
      separation: { value: DEFAULT_TUNING.separation, ...RANGES.separation },
      thickness: { value: DEFAULT_TUNING.thickness, ...RANGES.thickness },
      // Only the ink variants draw on paper.
      background: { value: DEFAULT_COLORS.background, render: () => isInk(variant) },
      ink: { value: DEFAULT_COLORS.ink, render: () => isInk(variant) },
    }),
    [variant],
  );

  // Colours are construction options, so changing one rebuilds the avatar; motion tuning does not.
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
      background,
      ink,
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
  }, [src, variant, background, ink]);

  // Tuning applies to the running avatar, so moving a slider does not restart it.
  const { waveAmplitude, jitter, waveSpeed, particles, strands, separation, thickness } = tuning;
  useEffect(() => {
    voice?.avatar.tune({ waveAmplitude, jitter, waveSpeed, particles, strands, separation, thickness });
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

  const handleStop = () => {
    voice?.audio.pause();
    setPlaying(false);
  };

  const handlePreset = (name: string) => {
    const { background: paper, ink: color, ...presetTuning } = PRESETS[name];
    setPreset(name);
    setValues({ ...presetTuning, background: paper ?? DEFAULT_COLORS.background, ink: color ?? DEFAULT_COLORS.ink });
  };

  // Sets the sliders to random values, so a good combination can be read back from the console and kept.
  const handleRandomize = () => {
    const random: VoiceAvatarTuning = {
      waveAmplitude: randomIn(RANGES.waveAmplitude),
      jitter: randomIn(RANGES.jitter),
      waveSpeed: randomIn(RANGES.waveSpeed),
      particles: randomIn(RANGES.particles),
      strands: randomIn(RANGES.strands),
      separation: randomIn(RANGES.separation),
      thickness: randomIn(RANGES.thickness),
    };
    log.info('voice avatar tuning', random);
    setValues(random);
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
          <Toolbar.Root classNames='p-2 gap-1 dx-modal-surface rounded-md shadow-md'>
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
            <Select.Root
              items={PRESET_ITEMS}
              value={[preset]}
              onValueChange={({ value: [name] }) => name && handlePreset(name)}
            >
              <Select.Trigger classNames='text-sm' placeholder='Preset' data-testid='voice-avatar.preset' />
              <Select.Content>
                {PRESET_ITEMS.map((item) => (
                  <Select.Item key={item.value} classNames='text-sm' item={item} />
                ))}
              </Select.Content>
            </Select.Root>
            <Button.Root icon='ph--shuffle--regular' label='Randomize' onClick={handleRandomize} />
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
          "The shape a simulated participant with `avatar` shows, one story per type. Serve the voice at `src`; the default is made with `say -v Daniel -r 150 -o voice.aiff \"I'm sorry, Dave. I'm afraid I can't do that.\"`, converted with `ffmpeg -i voice.aiff -c:a libopus agent-voice.webm` into `tools/storybook-react/static/simulated-call/`.",
      },
    },
  },
  argTypes: {
    variant: { control: false },
  },
  args: { src: '/simulated-call/agent-voice.webm', variant: 'ink' },
} satisfies Meta<typeof VoiceAvatarStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Torus: Story = { args: { variant: 'torus' } };

export const Spectrum: Story = { args: { variant: 'spectrum' } };

export const Ink: Story = { args: { variant: 'ink' } };

export const InkLine: Story = { args: { variant: 'ink-line' } };

export const InkMorph: Story = { args: { variant: 'ink-morph' } };
