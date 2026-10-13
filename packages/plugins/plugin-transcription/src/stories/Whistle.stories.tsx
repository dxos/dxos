//
// Copyright 2026 DXOS.org
//

/**
 * Lowest-latency streaming transcription with Whistle (https://cactuscompute.com/blog/whistle), a
 * 17 MB on-device speech model run as WASM in a worker. Unlike the `Transcription` story, nothing
 * is sent to a service: each pass re-decodes the buffered audio, words two consecutive passes agree
 * on are committed, and the unconfirmed tail is shown (italic) as soon as the first pass returns.
 *
 * - `Microphone` streams the default input; `File` plays the same hosted m4a as `Transcription`.
 * - The model downloads on the first press and is cached by the browser afterwards.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Transcription, TranscriptModel, useAudioFile, useAudioTrack } from '@dxos/react-ui-transcription';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollContainer from '@dxos/react-ui/ScrollContainer';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Message } from '@dxos/types';

import { type WhistleWord } from './whistle/protocol.ts';
import { type UseWhistleResult, useWhistle } from './whistle/useWhistle.ts';

/** A paragraph closes at the first sentence end after this many words. */
const PARAGRAPH_MIN_WORDS = 30;

const SENTENCE_END = /[.?!]$/;

const getText = (message: Message.Message): string =>
  message.blocks.find((block) => block._tag === 'transcript')?.text ?? '';

const renderParagraph = (message: Message.Message): string[] => [getText(message), ''];

const makeParagraph = (text: string): Message.Message =>
  Message.make({
    sender: { name: 'You' },
    blocks: [{ _tag: 'transcript', started: new Date().toISOString(), text }],
  });

/**
 * Projects committed words and the pending tail onto the transcript model: committed words extend
 * the open paragraph in place and the tail is re-rendered after them on every pass.
 */
const useStreamingTranscript = () => {
  const model = useMemo(() => new TranscriptModel<Message.Message>(renderParagraph), []);
  const state = useRef<{ paragraph?: Message.Message; committed: string[] }>({ committed: [] });

  const render = useCallback(
    (pending: string) => {
      const text = [state.current.committed.join(' '), pending ? `*${pending.trim()}*` : ''].filter(Boolean).join(' ');
      const paragraph = state.current.paragraph;
      if (!paragraph) {
        if (text) {
          state.current.paragraph = makeParagraph(text);
          model.appendChunk(state.current.paragraph);
        }
        return;
      }
      if (getText(paragraph) !== text) {
        Obj.update(paragraph, (paragraph) => {
          paragraph.blocks = [{ _tag: 'transcript', started: paragraph.created, text }];
        });
        model.updateChunk(paragraph);
      }
    },
    [model],
  );

  const commit = useCallback(
    (words: WhistleWord[], pending: string) => {
      for (const { word } of words) {
        state.current.committed.push(word);
        if (state.current.committed.length >= PARAGRAPH_MIN_WORDS && SENTENCE_END.test(word)) {
          render('');
          state.current = { committed: [] };
        }
      }
      render(pending);
    },
    [render],
  );

  return { model, commit };
};

const formatMs = (value?: number) => (value === undefined ? '–' : `${Math.round(value)} ms`);

const formatSeconds = (value?: number) => (value === undefined ? '–' : `${value.toFixed(2)} s`);

const Stats = ({ status, error, progress, stats }: UseWhistleResult) => {
  if (status === 'error') {
    return <span className='text-error-text text-sm truncate'>{error}</span>;
  }
  if (status === 'loading') {
    return <span className='text-description text-sm'>Loading model {Math.round(progress * 100)}%</span>;
  }
  return (
    <span className='text-description text-sm font-mono tabular-nums whitespace-nowrap'>
      load {formatMs(stats.loadMs)} · pass {formatMs(stats.passMs)} · lag {formatSeconds(stats.commitLag)} · backlog{' '}
      {formatSeconds(stats.backlog)}
    </span>
  );
};

type WhistlePanelProps = {
  track?: MediaStreamTrack;
  active: boolean;
  language?: string;
  keywords?: string[];
  actions: ReactNode;
};

const WhistlePanel = ({ track, active, language, keywords, actions }: WhistlePanelProps) => {
  const { model, commit } = useStreamingTranscript();
  const whistle = useWhistle({ track, active, language, keywords, onResult: commit });

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          {actions}
          <Toolbar.Separator variant='gap' />
          <Stats {...whistle} />
        </Toolbar.Root>
      </Panel.Header>
      <ScrollContainer.Root pin>
        <Panel.Body asChild>
          <ScrollContainer.Content>
            <ScrollContainer.Viewport>
              <Transcription model={model} />
            </ScrollContainer.Viewport>
          </ScrollContainer.Content>
        </Panel.Body>
      </ScrollContainer.Root>
    </Panel.Root>
  );
};

type StoryArgs = {
  language?: string;
  keywords?: string[];
};

const MicrophoneStory = ({ language, keywords }: StoryArgs) => {
  const [active, setActive] = useState(false);
  const track = useAudioTrack(active);
  return (
    <WhistlePanel
      track={track}
      active={active}
      language={language}
      keywords={keywords}
      actions={
        <Button.Root
          iconOnly
          icon={active ? 'ph--microphone-slash--regular' : 'ph--microphone--regular'}
          label={active ? 'Stop' : 'Start'}
          onClick={() => setActive((value) => !value)}
        />
      }
    />
  );
};

const FileStory = ({ audioUrl, language, keywords }: StoryArgs & { audioUrl: string }) => {
  const [active, setActive] = useState(false);
  const { audio, stream, track } = useAudioFile(audioUrl);

  // Pipe the decoded stream into an <audio> element so playback is audible while it is transcribed.
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    if (active) {
      void audio?.play();
    } else {
      audio?.pause();
    }
  }, [audio, active]);

  return (
    <>
      <audio ref={audioRef} autoPlay />
      <WhistlePanel
        track={track}
        active={active}
        language={language}
        keywords={keywords}
        actions={
          <Button.Root
            iconOnly
            disabled={!stream}
            icon={active ? 'ph--pause--regular' : 'ph--play--regular'}
            label={active ? 'Pause' : 'Play'}
            onClick={() => setActive((value) => !value)}
          />
        }
      />
    </>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Whistle',
  render: MicrophoneStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Microphone: Story = {
  args: {
    language: 'en',
  },
};

export const File: StoryObj<typeof FileStory> = {
  render: FileStory,
  args: {
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://media.dxos.network/audio-london.m4a',
    language: 'en',
  },
};
