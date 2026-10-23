//
// Copyright 2026 DXOS.org
//

/**
 * Streaming transcription with Whistle (https://cactuscompute.com/blog/whistle), a 17 MB on-device
 * speech model run as WASM in a worker, set up as Cactus's own live demo: one continuous stream with the
 * browser's noise suppression, re-decoded every second of new audio. Unlike the `Transcription` story,
 * nothing is sent to a service: words two consecutive passes agree on are committed, and the unconfirmed
 * tail is shown (italic) as soon as the first pass returns.
 *
 * - The toolbar's Low latency switch makes it a pass every 200 ms: words commit sooner,
 *   but passes that close together agree on half-heard words more often.
 * - A pause of a second or more between words, or Stop, starts a new paragraph; each paragraph's audio can be
 *   saved on its own.
 * - `Microphone` streams the default input; `File` plays the same hosted m4a as `Transcription`.
 * - The model downloads on the first press and is cached by the browser afterwards.
 * - The waveform shows everything captured; the raw recording stays in the tab and can be saved as WAV.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { useAudioFile, useAudioTrack } from '@dxos/react-ui-transcription';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollContainer from '@dxos/react-ui/ScrollContainer';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { WHISTLE_AUDIO_CONSTRAINTS } from './whistle/capture.ts';
import { type WhistleWord } from './whistle/protocol.ts';
import { type Recording } from './whistle/recording.ts';
import { type UseWhistleResult, useWhistle } from './whistle/useWhistle.ts';
import { Waveform } from './whistle/Waveform.tsx';

/** New audio per pass: as Cactus's demo for accuracy, or a fifth of it for latency. */
const ACCURATE_PASS_MS = 1_000;
const LOW_LATENCY_PASS_MS = 200;

/** A pause at least this long (seconds between committed words) starts a new paragraph. */
const PARAGRAPH_PAUSE_SECONDS = 1;

/** Without a pause, a paragraph closes at the first sentence end after this many words. */
const PARAGRAPH_MIN_WORDS = 30;

const SENTENCE_END = /[.?!]$/;

/** Audio kept either side of a paragraph's words when it is saved, so its first and last sounds are whole. */
const PARAGRAPH_PADDING_SECONDS = 0.25;

/** A paragraph and where its words sit in the recording, in seconds. */
type Paragraph = {
  id: number;
  start: number;
  end: number;
  text: string;
};

type OpenParagraph = Omit<Paragraph, 'text'> & { words: string[] };

/**
 * Groups committed words into paragraphs: a pause, a stopped stream, or a sentence end once a paragraph is
 * long enough closes the open one. The unconfirmed tail is kept apart and shown after the last paragraph.
 */
const useStreamingTranscript = () => {
  const [snapshot, setSnapshot] = useState<{ paragraphs: Paragraph[]; pending: string }>({
    paragraphs: [],
    pending: '',
  });
  const state = useRef<{ closed: Paragraph[]; open?: OpenParagraph; lastEnd?: number; nextId: number }>({
    closed: [],
    nextId: 0,
  });

  const commit = useCallback((words: WhistleWord[], pending: string, ended: boolean) => {
    const current = state.current;
    const close = () => {
      if (current.open) {
        const { words, ...paragraph } = current.open;
        current.closed.push({ ...paragraph, text: words.join(' ') });
        current.open = undefined;
      }
    };

    for (const { word, start, end } of words) {
      if (current.lastEnd !== undefined && start - current.lastEnd >= PARAGRAPH_PAUSE_SECONDS) {
        close();
      }
      current.open ??= { id: current.nextId++, start, end, words: [] };
      current.open.words.push(word);
      current.open.end = end;
      current.lastEnd = end;
      if (current.open.words.length >= PARAGRAPH_MIN_WORDS && SENTENCE_END.test(word)) {
        close();
      }
    }
    if (ended) {
      close();
      current.lastEnd = undefined;
    }

    const { open } = current;
    setSnapshot({
      paragraphs: open ? [...current.closed, { ...open, text: open.words.join(' ') }] : [...current.closed],
      pending: ended ? '' : pending.trim(),
    });
  }, []);

  return { ...snapshot, commit };
};

const formatClock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
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

/** Saves the recording, or the part of it between `start` and `end` seconds, as WAV. */
const saveRecording = (recording: Recording, range?: { start: number; end: number }) => {
  const url = URL.createObjectURL(recording.toWav(range?.start, range?.end));
  const link = document.createElement('a');
  link.href = url;
  link.download = range
    ? `whistle-${formatClock(range.start).replace(':', 'm')}s.wav`
    : `whistle-${new Date().toISOString()}.wav`;
  link.click();
  URL.revokeObjectURL(url);
};

type WhistlePanelProps = {
  track?: MediaStreamTrack;
  active: boolean;
  language?: string;
  keywords?: string[];
  lowLatency?: boolean;
  actions: ReactNode;
};

const WhistlePanel = ({ track, active, language, keywords, lowLatency = false, actions }: WhistlePanelProps) => {
  const { paragraphs, pending, commit } = useStreamingTranscript();
  const [fast, setFast] = useState(lowLatency);
  useEffect(() => setFast(lowLatency), [lowLatency]);
  const whistle = useWhistle({
    track,
    active,
    language,
    keywords,
    minPassMs: fast ? LOW_LATENCY_PASS_MS : ACCURATE_PASS_MS,
    onResult: commit,
  });

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          {actions}
          <Input.Switch label='Low latency' checked={fast} onCheckedChange={({ checked }) => setFast(checked)} />
          <Button.Root
            iconOnly
            icon='ph--download-simple--regular'
            label='Save recording'
            onClick={() => saveRecording(whistle.recording)}
          />
          <Toolbar.Separator variant='gap' />
          <Stats {...whistle} />
        </Toolbar.Root>
        <Waveform recording={whistle.recording} />
      </Panel.Header>
      <ScrollContainer.Root pin>
        <Panel.Body asChild>
          <ScrollContainer.Content>
            <ScrollContainer.Viewport>
              <div className='flex flex-col gap-2 p-2'>
                {paragraphs.map((paragraph, index) => (
                  <div key={paragraph.id} className='flex items-start gap-3'>
                    <span className='shrink-0 w-10 pt-1 text-sm text-description font-mono tabular-nums'>
                      {formatClock(paragraph.start)}
                    </span>
                    <p className='grow pt-0.5'>
                      {paragraph.text}
                      {index === paragraphs.length - 1 && pending && <em className='text-description'> {pending}</em>}
                    </p>
                    <Button.Root
                      iconOnly
                      variant='ghost'
                      icon='ph--download-simple--regular'
                      label='Save this paragraph'
                      onClick={() =>
                        saveRecording(whistle.recording, {
                          start: paragraph.start - PARAGRAPH_PADDING_SECONDS,
                          end: paragraph.end + PARAGRAPH_PADDING_SECONDS,
                        })
                      }
                    />
                  </div>
                ))}
                {paragraphs.length === 0 && pending && <em className='ps-13 text-description'>{pending}</em>}
              </div>
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
  /** Start in low-latency mode (a pass every 200 ms of new audio instead of every second). */
  lowLatency?: boolean;
};

const MicrophoneStory = ({ language, keywords, lowLatency }: StoryArgs) => {
  const [active, setActive] = useState(false);
  const track = useAudioTrack(active, WHISTLE_AUDIO_CONSTRAINTS);
  return (
    <WhistlePanel
      track={track}
      active={active}
      language={language}
      keywords={keywords}
      lowLatency={lowLatency}
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

const FileStory = ({ audioUrl, language, keywords, lowLatency }: StoryArgs & { audioUrl: string }) => {
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
        lowLatency={lowLatency}
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
    lowLatency: false,
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
