//
// Copyright 2026 DXOS.org
//

/**
 * Transcription into a message list, one story per source:
 *
 * - `Live` transcribes the microphone through RealtimeKit on the preview EDGE.
 * - `File` transcribes a hosted (or uploaded) audio file through RealtimeKit on the preview EDGE as it plays.
 * - `TextMock` needs no audio and no network: scripted sentences are appended one at a time.
 *
 * `Live` and `File` bind their identity to a `test+*@dxos.org` account before enabling their controls, since
 * calls-service serves account holders only, and stream into that identity's one-person transcription meeting; each
 * committed block becomes a message.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, {
  type ChangeEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type CommitFn, makeCorrectionStage } from '@dxos/pipeline-transcription';
import { type TestAccountState, useTestAccount } from '@dxos/plugin-client/testing';
import { useJoinTranscription } from '@dxos/react-client';
import {
  type PipelinePhase,
  type TrackTranscriber,
  Transcription,
  type TranscriptModel,
  createRealtimeKitTranscriber,
  useAudioFile,
  useFeedModelAdapter,
  useRecordingPipeline,
} from '@dxos/react-ui-transcription';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollContainer from '@dxos/react-ui/ScrollContainer';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type ContentBlock, Message } from '@dxos/types';

import { createStoryDecorators } from '#testing';

import { renderByline } from '../util/index.ts';

const EDGE_URL = 'https://preview.dxos.network/';
const HUB_URL = new URL('hub/', EDGE_URL).href;

// https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
const AUDIO_URL = 'https://media.dxos.network/audio-london.m4a';

const MOCK_SENTENCES = [
  'London is one of the busiest cities in Europe.',
  'Millions of people travel into the centre every day, most of them by underground train or by bus.',
  'The city has hundreds of parks and green spaces.',
  'You can hear more than three hundred languages on its streets.',
  'Many people say that variety is the best thing about living here.',
];

const MOCK_INTERVAL = '1500 millis';

const makeMessage = (block: ContentBlock.Transcript) =>
  Message.make({ sender: { name: 'You' }, created: new Date().toISOString(), blocks: [block] });

// Module-level: the model adapter rebuilds its model whenever the renderer's identity changes.
const RENDER_BYLINE = renderByline([]);

/** An in-memory message list and its model; production writes to a space-backed `Feed`. */
const useStoryMessages = () => {
  const [messages, setMessages] = useState<Message.Message[]>([]);
  const appendMessage = useCallback((message: Message.Message) => setMessages((prev) => [...prev, message]), []);
  const model = useFeedModelAdapter(RENDER_BYLINE, messages);
  return { model, appendMessage };
};

/** Appends one message per committed block, keyed by block identity so a re-commit does not duplicate it. */
const useCommitMessages = (appendMessage: (message: Message.Message) => void): CommitFn => {
  const seen = useRef(new WeakSet<ContentBlock.Transcript>());
  return useCallback<CommitFn>(
    (write, window) =>
      Effect.sync(() => {
        for (const update of write.blockUpdates ?? []) {
          const block = window[update.index];
          if (!block || seen.current.has(block)) {
            continue;
          }
          seen.current.add(block);
          appendMessage(makeMessage({ ...block, text: update.corrected ?? block.text }));
        }
      }),
    [appendMessage],
  );
};

/** RealtimeKit for the session's track; absent until the client has an EDGE calls endpoint. */
const useRealtimeKitTranscriber = (): TrackTranscriber | undefined => {
  const join = useJoinTranscription();
  return useMemo(() => join && ((track) => createRealtimeKitTranscriber({ audioStreamTrack: track, join })), [join]);
};

const useStages = () => useMemo(() => [makeCorrectionStage()], []);

/**
 * Turns the control off when the pipeline falls from recording straight back to idle, which it does only when its
 * session fails to open (a stop drains first), so the control offers a retry rather than a dead Stop.
 */
const useResetOnFailure = (phase: PipelinePhase, setActive: (active: boolean) => void) => {
  const previous = useRef(phase);
  useEffect(() => {
    if (previous.current === 'recording' && phase === 'idle') {
      setActive(false);
    }
    previous.current = phase;
  }, [phase, setActive]);
};

/** Why the story's controls cannot work, if they cannot: a failed account binding needs a reload to retry. */
const accountError = (account: TestAccountState): string | undefined =>
  account instanceof Error ? `Account binding failed (${account.message}); reload to retry.` : undefined;

const TranscriptPanel = ({
  model,
  error,
  children,
}: PropsWithChildren<{ model: TranscriptModel<Message.Message>; error?: string }>) => (
  <Panel.Root>
    <Panel.Header>
      <Toolbar.Root>
        {children}
        {error && <Toolbar.Text>{error}</Toolbar.Text>}
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

const LiveStory = () => {
  const account = useTestAccount(HUB_URL);
  const [recording, setRecording] = useState(false);
  const [track, setTrack] = useState<MediaStreamTrack>();
  const [micError, setMicError] = useState<string>();
  // A permission prompt can outlive the story; a track granted after unmount is stopped at once.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { model, appendMessage } = useStoryMessages();
  const commit = useCommitMessages(appendMessage);
  const transcriber = useRealtimeKitTranscriber();
  const { phase } = useRecordingPipeline({
    transcriber,
    segmentSentences: true,
    active: recording,
    track,
    stages: useStages(),
    commit,
  });
  useResetOnFailure(phase, setRecording);

  // The track outlives Stop until the pipeline has drained, so the last words still reach the transcriber.
  useEffect(() => {
    if (!recording && phase === 'idle') {
      setTrack(undefined);
    }
  }, [recording, phase]);
  useEffect(() => () => track?.stop(), [track]);

  const handleToggle = useCallback(async () => {
    if (recording) {
      setRecording(false);
      return;
    }

    // Acquired here, not by the pipeline, so a refused microphone is reported instead of a Stop that records nothing.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        stream.getTracks().forEach((granted) => granted.stop());
        return;
      }
      setMicError(undefined);
      setTrack(stream.getAudioTracks()[0]);
      setRecording(true);
    } catch (error) {
      setMicError(`Microphone unavailable (${error instanceof Error ? error.message : String(error)}).`);
    }
  }, [recording]);

  return (
    <TranscriptPanel model={model} error={accountError(account) ?? micError}>
      <Button.Root
        iconOnly
        // A new session waits for the previous one to drain, which would otherwise end the new one's pipeline.
        disabled={!transcriber || account !== 'bound' || phase === 'draining'}
        icon={recording ? 'ph--stop--regular' : 'ph--microphone--regular'}
        label={recording ? 'Stop' : 'Record'}
        onClick={handleToggle}
      />
    </TranscriptPanel>
  );
};

const FileStory = () => {
  const account = useTestAccount(HUB_URL);
  const [playing, setPlaying] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>();
  useEffect(() => {
    return () => {
      if (uploadedUrl) {
        URL.revokeObjectURL(uploadedUrl);
      }
    };
  }, [uploadedUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPlaying(false);
      setUploadedUrl(URL.createObjectURL(file));
    }
    // Reset so the same file can be picked again.
    event.target.value = '';
  }, []);

  const { audio, stream, track, error: loadError } = useAudioFile(uploadedUrl ?? AUDIO_URL);
  useEffect(() => {
    if (loadError) {
      setPlaying(false);
    }
  }, [loadError]);

  // The decoded stream also feeds an <audio> element, so the file is heard while it is transcribed.
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    if (!audio) {
      return;
    }
    if (playing) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, [audio, playing]);

  const { model, appendMessage } = useStoryMessages();
  const commit = useCommitMessages(appendMessage);
  const transcriber = useRealtimeKitTranscriber();
  const { phase } = useRecordingPipeline({
    transcriber,
    segmentSentences: true,
    active: playing,
    track,
    stages: useStages(),
    commit,
  });
  useResetOnFailure(phase, setPlaying);

  return (
    <>
      <audio ref={audioRef} autoPlay />
      <TranscriptPanel
        model={model}
        error={accountError(account) ?? (loadError && `Audio file failed to load (${loadError.message}).`)}
      >
        <Button.Root
          iconOnly
          // Not gated on the stream: until a user gesture, the browser holds the file's audio context suspended, and
          // this click is that gesture; playback and transcription start once the stream arrives.
          disabled={!transcriber || account !== 'bound' || phase === 'draining' || !!loadError}
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          label={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying((value) => !value)}
        />
        <input ref={fileInputRef} type='file' accept='audio/*' className='hidden' onChange={handleFileChange} />
        <Button.Root
          iconOnly
          icon='ph--upload--regular'
          label='Upload audio'
          onClick={() => fileInputRef.current?.click()}
        />
      </TranscriptPanel>
    </>
  );
};

const TextMockStory = () => {
  const [running, setRunning] = useState(false);
  const { model, appendMessage } = useStoryMessages();
  const next = useRef(0);
  useEffect(() => {
    if (!running) {
      return;
    }
    const fiber = Effect.runFork(
      Effect.sleep(MOCK_INTERVAL).pipe(
        Effect.flatMap(() =>
          Effect.sync(() => {
            // Not `next.current++`: the React Compiler turns a ref's post-increment into a pre-increment.
            const index = next.current;
            next.current = index + 1;
            const text = MOCK_SENTENCES[index % MOCK_SENTENCES.length];
            appendMessage(makeMessage({ _tag: 'transcript', started: new Date().toISOString(), text }));
          }),
        ),
        Effect.forever,
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [running, appendMessage]);

  return (
    <TranscriptPanel model={model}>
      <Button.Root
        iconOnly
        icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
        label={running ? 'Pause' : 'Play'}
        onClick={() => setRunning((value) => !value)}
      />
    </TranscriptPanel>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Transcription',
  decorators: createStoryDecorators(),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// Live and File bind a preview Hub account on every render, which CI's smoke run must not do.
export const Live: Story = {
  render: () => <LiveStory />,
  parameters: { edgeUrl: EDGE_URL },
  tags: ['!test'],
};

export const File: Story = {
  render: () => <FileStory />,
  parameters: { edgeUrl: EDGE_URL },
  tags: ['!test'],
};

export const TextMock: Story = {
  render: () => <TextMockStory />,
};
