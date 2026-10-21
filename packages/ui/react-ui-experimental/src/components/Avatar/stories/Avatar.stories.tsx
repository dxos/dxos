//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { levaStore, useControls } from 'leva';
import React, { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Config, randomize } from '../params.ts';
import { AudioProvider } from '../providers/index.ts';
import { type VisualizationRuntime, createAgentVisualization } from '../runtime.ts';
import { type AnyVisualization } from '../visualization.ts';
import {
  chaos,
  getVisualization,
  ink,
  inkLine,
  inkMorph,
  kube,
  orb,
  ripple,
  spectrum,
} from '../visualizations/index.ts';
import { levaControls, levaPaths, toConfig } from './tuner.ts';

type StoryProps = {
  /** The visualization's id. */
  visualization: string;
  /** Audio file the agent speaks. */
  src: string;
};

const DEFAULT_PRESET = 'default';

type Voice = {
  runtime: VisualizationRuntime<AnyVisualization['defaults']>;
  audio: HTMLAudioElement;
  context: AudioContext;
};

/**
 * One visualization, moving with a voice file that plays through the speakers. Its params are tuned live in a Leva
 * folder named for it (Leva's store is shared across stories); the toolbar picks a preset, randomizes, or copies the
 * current config as JSON for a new preset.
 */
const VisualizationStory = ({ visualization: id, src }: StoryProps) => {
  const visualization = getVisualization(id) ?? ink;
  const mount = useRef<HTMLDivElement>(null);
  const [voice, setVoice] = useState<Voice>();
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const presetItems = [DEFAULT_PRESET, ...Object.keys(visualization.presets)].map((name) => ({
    value: name,
    label: name,
  }));

  const values = toConfig(
    useControls(visualization.title, levaControls(visualization.params, visualization.defaults), [visualization.id]),
  );
  // Presets and Randomize write through Leva's store, so its sliders follow.
  const setValues = (config: Config) => levaStore.set(levaPaths(visualization.title, config), false);
  // Leva's store outlives a story (and shares folders with the component stories), so each starts from its defaults.
  useEffect(() => setValues(visualization.defaults), [visualization.id]);

  useEffect(() => {
    const context = new AudioContext();
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';
    const source = context.createMediaElementSource(audio);
    const destination = context.createMediaStreamDestination();
    source.connect(destination);
    source.connect(context.destination);
    const runtime = createAgentVisualization({
      visualization,
      providers: [new AudioProvider(context, destination.stream.getAudioTracks()[0])],
      width: 960,
      height: 540,
    });
    runtime.canvas.className = 'w-full h-full rounded-md';
    mount.current?.replaceChildren(runtime.canvas);
    const onEnded = () => setPlaying(false);
    audio.addEventListener('ended', onEnded);
    setVoice({ runtime, audio, context });

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      runtime.close();
      void context.close();
      setPlaying(false);
    };
  }, [visualization, src]);

  // Tuning applies to the running visualization, so moving a slider does not rebuild it.
  const serialized = JSON.stringify(values);
  useEffect(() => {
    voice?.runtime.configure(values);
  }, [voice, serialized]);

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
    setPreset(name);
    setValues({ ...visualization.defaults, ...toConfig(visualization.presets[name] ?? {}) });
  };

  const handleRandomize = () => {
    const random = randomize(visualization.params);
    log.info('random config', { visualization: visualization.id, config: random });
    setValues(random);
  };

  // A config that looks right becomes a preset by pasting this JSON into the visualization's `presets`.
  const handleCopy = () => {
    const json = JSON.stringify(voice?.runtime.config ?? values, null, 2);
    log.info('config', { visualization: visualization.id, config: json });
    void navigator.clipboard?.writeText(json).catch((err) => log.catch(err));
  };

  return (
    <Layout.Flex column classNames='relative grow overflow-hidden'>
      <Layout.Flex center classNames='grow p-4'>
        <div ref={mount} className='aspect-video max-w-full max-h-full w-full' />
      </Layout.Flex>
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
              items={presetItems}
              value={[preset]}
              onValueChange={({ value: [name] }) => name && handlePreset(name)}
            >
              <Select.Trigger classNames='text-sm' placeholder='Preset' data-testid='agent-visualization.preset' />
              <Select.Content>
                {presetItems.map((item) => (
                  <Select.Item key={item.value} classNames='text-sm' item={item} />
                ))}
              </Select.Content>
            </Select.Root>
            <Button.Root icon='ph--shuffle--regular' label='Randomize' onClick={handleRandomize} />
            <Button.Root icon='ph--copy--regular' label='Copy' onClick={handleCopy} />
          </Toolbar.Root>
        </Layout.Flex>
      </Layout.Flex>
    </Layout.Flex>
  );
};

const meta = {
  title: 'ui/react-ui-experimental/Avatar',
  render: VisualizationStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "Each visualization driven by an `AudioProvider` on a voice file. Serve the voice at `src`; the default is made with `say -v Daniel -r 150 -o voice.aiff \"I'm sorry, Dave. I'm afraid I can't do that.\"`, converted with `ffmpeg -i voice.aiff -c:a libopus agent-voice.webm` into `tools/storybook-react/static/simulated-call/`.",
      },
    },
  },
  argTypes: { visualization: { control: false } },
  args: { visualization: ink.id, src: '/simulated-call/agent-voice.webm' },
} satisfies Meta<typeof VisualizationStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Orb: Story = { args: { visualization: orb.id } };

export const Ripple: Story = { args: { visualization: ripple.id } };

export const Chaos: Story = { args: { visualization: chaos.id } };

export const Kube: Story = { args: { visualization: kube.id } };

export const Spectrum: Story = { args: { visualization: spectrum.id } };

export const Ink: Story = { args: { visualization: ink.id } };

export const InkLine: Story = { args: { visualization: inkLine.id } };

export const InkMorph: Story = { args: { visualization: inkMorph.id } };
