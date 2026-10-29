//
// Copyright 2026 DXOS.org
//

/**
 * A voice-controlled home, entirely on the device: Whistle transcribes the request as it is spoken, and
 * Needle 3 (https://huggingface.co/Cactus-Compute/needle3), Cactus's tool-calling model, loaded into the
 * same engine, turns it into calls against five home tools. Nothing is sent to a service.
 *
 * - Hold Space (or toggle Talk) and say "turn on the kitchen lights"; the request ends when you let go.
 *   Hands-free keeps the microphone open and ends a request at a short pause instead.
 * - Built for latency: the request is answered from the latest pass the moment it ends, before the
 *   closing pass; Low latency also skips the model's reasoning line (~0.5 s sooner), except for
 *   requests that join two actions ("... and ..."), which need it to make both calls.
 * - Calls the model withholds (low confidence) are offered as suggestions rather than run.
 * - First use downloads the engine and both models (~52 MB, kept in Cache Storage) and compiles the
 *   tools (several seconds, once per load).
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useAudioTrack } from '@dxos/react-ui-transcription';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollContainer from '@dxos/react-ui/ScrollContainer';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { WHISTLE_AUDIO_CONSTRAINTS } from '../whistle/capture.ts';
import { type AssistantConfig, NEEDLE_MODEL_URL, type NeedleCall, type WhistleWord } from '../whistle/protocol.ts';
import { usePushToTalk } from '../whistle/usePushToTalk.ts';
import { type UseWhistleResult, type WhistleAnswer, useWhistle } from '../whistle/useWhistle.ts';
import { Waveform } from '../whistle/Waveform.tsx';
import { FloorPlan } from './home/FloorPlan.tsx';
import { HOME_SYSTEM, HOME_TOOLS, type HomeState, applyCall, formatCall, initialHome } from './home/home.ts';

const ASSISTANT: AssistantConfig = { modelUrl: NEEDLE_MODEL_URL, tools: HOME_TOOLS, system: HOME_SYSTEM };

/** Device names Whistle would otherwise hear as other words. */
const HOME_KEYWORDS = ['dim', 'thermostat', 'blinds', 'hallway', 'garage'];

/**
 * Passes run often so the latest pass, which the request is answered from, is never far behind the speaker;
 * a pass on a few seconds of speech takes a fraction of the interval.
 */
const PASS_MS = 250;

/** Hands-free: silence this long ends a request. Shorter answers sooner but splits requests at a breath. */
const PAUSE_SECONDS = 0.7;
const LOW_LATENCY_PAUSE_SECONDS = 0.5;

/** The answer budget: room for the reasoning line, or only the calls. */
const MAX_TOKENS = 128;
const LOW_LATENCY_MAX_TOKENS = 32;

type Command = {
  id: number;
  text: string;
  applied: { call: NeedleCall; summary?: string; error?: string }[];
  /** Calls the model withheld, offered for confirmation. */
  suggested: NeedleCall[];
  reasoning: string | null;
  confidence: number | null;
  latencyMs: number;
  answerMs: number;
};

const formatMs = (value?: number) => (value === undefined ? '-' : `${Math.round(value)} ms`);

/** Model loading and errors, beside the talk button. */
const Status = ({ status, error, progress }: UseWhistleResult) => {
  switch (status) {
    case 'error':
      return <span className='text-error-text text-sm truncate'>{error}</span>;
    case 'loading':
      return <span className='text-fg-muted text-sm'>Loading models {Math.round(progress * 100)}%</span>;
    case 'preparing':
      return <span className='text-fg-muted text-sm'>Preparing tools...</span>;
    default:
      return null;
  }
};

const CommandEntry = ({ command, onApply }: { command: Command; onApply: (call: NeedleCall) => void }) => (
  <div className='flex flex-col gap-1 p-2 rounded-sm border border-separator'>
    <span className='font-medium'>"{command.text}"</span>
    {command.applied.map(({ call, summary, error }, index) => (
      <div key={index} className='flex flex-col'>
        <span className={error ? 'text-error-text text-sm' : 'text-sm'}>{error ?? summary}</span>
        <code className='text-xs text-fg-subtle'>{formatCall(call)}</code>
      </div>
    ))}
    {command.suggested.map((call, index) => (
      <div key={`suggested-${index}`} className='flex items-center gap-2'>
        <span className='grow text-sm text-fg-muted'>
          Did you mean <code className='text-xs'>{formatCall(call)}</code>?
        </span>
        <Button.Root size='sm' label='Do it' onClick={() => onApply(call)} />
      </div>
    ))}
    {command.applied.length === 0 && command.suggested.length === 0 && (
      <span className='text-sm text-fg-muted'>No tool for that.</span>
    )}
    {command.reasoning && <span className='text-xs text-fg-subtle italic'>{command.reasoning}</span>}
    <span className='text-xs text-fg-subtle font-mono tabular-nums'>
      {formatMs(command.latencyMs)} after the request ended · model {formatMs(command.answerMs)}
      {command.confidence !== null && ` · confidence ${command.confidence.toFixed(2)}`}
    </span>
  </div>
);

type StoryArgs = {
  /** Start in low-latency mode (no reasoning line, shorter hands-free pause). */
  lowLatency?: boolean;
  /** Start hands-free (always listening, a pause ends a request). */
  handsFree?: boolean;
};

const HomeStory = ({ lowLatency = true, handsFree: handsFreeProp = false }: StoryArgs) => {
  const [home, setHome] = useState<HomeState>(initialHome);
  const [touched, setTouched] = useState<string[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [heard, setHeard] = useState('');
  const [fast, setFast] = useState(lowLatency);
  const [handsFree, setHandsFree] = useState(handsFreeProp);
  const [toggled, setToggled] = useState(false);
  const held = usePushToTalk();
  const active = toggled || held;
  useEffect(() => setFast(lowLatency), [lowLatency]);

  // The microphone stays open after first use, so push-to-talk does not clip the first word while it opens.
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    if (active) {
      setWarm(true);
    }
  }, [active]);
  const track = useAudioTrack(warm, WHISTLE_AUDIO_CONSTRAINTS);

  const homeRef = useRef(home);
  homeRef.current = home;
  const nextId = useRef(0);

  /** Applies calls in order, each to the state the previous one left. */
  const run = useCallback((calls: NeedleCall[]) => {
    let state = homeRef.current;
    const changed: string[] = [];
    const applied = calls.map((call) => {
      const result = applyCall(state, call);
      if ('error' in result) {
        return { call, error: result.error };
      }
      state = result.state;
      changed.push(...result.touched);
      return { call, summary: result.summary };
    });
    homeRef.current = state;
    setHome(state);
    setTouched(changed);
    return applied;
  }, []);

  const onAnswer = useCallback(
    ({ text, answer, answerMs, latencyMs }: WhistleAnswer) => {
      const applied = run(answer.function_calls);
      setCommands((previous) => [
        ...previous,
        {
          id: nextId.current++,
          text,
          applied,
          suggested: answer.suppressed_calls,
          reasoning: answer.reasoning,
          confidence: answer.confidence,
          latencyMs,
          answerMs,
        },
      ]);
    },
    [run],
  );

  /** Applies a suggestion the user confirmed, and moves it to the command's applied calls. */
  const confirm = useCallback(
    (id: number, call: NeedleCall) => {
      const [result] = run([call]);
      setCommands((previous) =>
        previous.map((command) =>
          command.id === id
            ? {
                ...command,
                applied: [...command.applied, result],
                suggested: command.suggested.filter((candidate) => candidate !== call),
              }
            : command,
        ),
      );
    },
    [run],
  );

  // The words heard in the current request; a stream's end (a stop or, hands-free, a pause) clears them.
  const requestWords = useRef<string[]>([]);
  const onResult = useCallback((words: WhistleWord[], pending: string, ended: boolean) => {
    if (ended) {
      requestWords.current = [];
      setHeard('');
      return;
    }
    requestWords.current.push(...words.map(({ word }) => word));
    setHeard([...requestWords.current, pending.trim()].join(' ').trim());
  }, []);

  const whistle = useWhistle({
    track,
    active,
    language: 'en',
    keywords: HOME_KEYWORDS,
    minPassMs: PASS_MS,
    assistant: ASSISTANT,
    maxTokens: fast ? LOW_LATENCY_MAX_TOKENS : MAX_TOKENS,
    endpoint: { pauseSeconds: handsFree ? (fast ? LOW_LATENCY_PAUSE_SECONDS : PAUSE_SECONDS) : undefined },
    onResult,
    onAnswer,
  });

  const listening = active && whistle.status === 'ready';

  return (
    <>
      <Panel.Root classNames='w-[40rem] dx-base-surface'>
        <Panel.Header>
          <Toolbar.Root classNames='py-2'>
            <Button.Root
              size='lg'
              variant={active ? 'destructive' : 'primary'}
              icon={active ? 'ph--stop--regular' : 'ph--microphone--regular'}
              label={active ? 'Stop' : 'Talk'}
              onClick={() => setToggled((value) => !value)}
            />
            <span className='text-sm text-fg-muted'>
              {held ? 'Release Space to send' : handsFree ? 'Pause to send' : 'or hold Space to talk'}
            </span>
            <Toolbar.Separator variant='gap' />
            <Status {...whistle} />
          </Toolbar.Root>
          <Waveform recording={whistle.recording} />
        </Panel.Header>
        <Panel.Body classNames='flex flex-col'>
          <FloorPlan home={home} touched={touched} />
          <p className='px-3 py-2 min-h-10 text-fg-muted'>
            {heard ? (
              <em>{heard}</em>
            ) : listening ? (
              'Listening...'
            ) : (
              'Try "turn on the kitchen lights and lock the front door".'
            )}
          </p>
        </Panel.Body>
      </Panel.Root>

      <Panel.Root classNames='w-96 dx-base-surface'>
        <Panel.Header>
          <div className='flex flex-col gap-2 p-trim-md'>
            <Input.Switch label='Low latency' checked={fast} onCheckedChange={({ checked }) => setFast(checked)} />
            <Input.Switch
              label='Hands-free'
              checked={handsFree}
              onCheckedChange={({ checked }) => setHandsFree(checked)}
            />
            <p className='text-xs text-fg-muted'>
              {fast
                ? 'Calls only, no reasoning line: about half a second sooner. Two actions in one request still get the full budget.'
                : 'The model explains each argument before its calls.'}
            </p>
            <span className='text-xs text-fg-subtle font-mono tabular-nums'>
              Load {formatMs(whistle.stats.loadMs)} · pass {formatMs(whistle.stats.passMs)} · answer{' '}
              {formatMs(whistle.stats.answerLatency)}
            </span>
          </div>
        </Panel.Header>
        <ScrollContainer.Root pin>
          <Panel.Body asChild>
            <ScrollContainer.Content>
              <ScrollContainer.Viewport>
                <Layout.Flex column gap='sm' classNames='p-2'>
                  {commands.map((command) => (
                    <CommandEntry key={command.id} command={command} onApply={(call) => confirm(command.id, call)} />
                  ))}
                </Layout.Flex>
              </ScrollContainer.Viewport>
            </ScrollContainer.Content>
          </Panel.Body>
        </ScrollContainer.Root>
      </Panel.Root>
    </>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Home',
  render: HomeStory,
  decorators: [
    withTheme(),
    withLayout(({ children }) => (
      <div className='fixed inset-0 flex justify-center gap-2 overflow-hidden dx-deck-surface'>{children}</div>
    )),
  ],
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    lowLatency: true,
    handsFree: false,
  },
};
