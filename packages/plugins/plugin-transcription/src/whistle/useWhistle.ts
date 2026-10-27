//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { startCapture } from './capture.ts';
import {
  type AssistantConfig,
  type NeedleAnswer,
  WHISTLE_ASSETS,
  type WhistleRequest,
  type WhistleResponse,
  type WhistleWord,
} from './protocol.ts';
import { Recording } from './recording.ts';

export type WhistleStatus = 'idle' | 'loading' | 'preparing' | 'ready' | 'error';

export type WhistleStats = {
  /** Milliseconds from worker start to model loaded. */
  loadMs?: number;
  /** Duration of the latest pass. */
  passMs?: number;
  /** Seconds of captured audio waiting behind the latest pass. */
  backlog?: number;
  /** Seconds between the end of the latest committed word and the moment it was committed. */
  commitLag?: number;
  /** Milliseconds from the end of a request (a stop, or the end of its pause) to its answer. */
  answerLatency?: number;
  /** Milliseconds the assistant's model took to answer. */
  answerMs?: number;
};

/** An answered request, as delivered to `onAnswer`. */
export type WhistleAnswer = {
  text: string;
  answer: NeedleAnswer;
  answerMs: number;
  maxTokens: number;
  /** Milliseconds from the end of the request (a stop, or the end of its pause) to the answer. */
  latencyMs: number;
};

export type UseWhistleProps = {
  track?: MediaStreamTrack;
  active?: boolean;
  language?: string;
  keywords?: string[];
  /** Smallest batch of new audio, in milliseconds, worth a pass; lower commits sooner but less accurately. */
  minPassMs?: number;
  /** Where captured audio is kept; one is made when omitted. */
  recording?: Recording;
  /**
   * Called after every pass with the words it committed (seconds into the {@link Recording}), the unconfirmed
   * tail, and whether the stream ended with it.
   */
  onResult?: (words: WhistleWord[], pending: string, ended: boolean) => void;
  /** Loads Needle beside Whistle to answer every ended stream against these tools; read once, at load. */
  assistant?: AssistantConfig;
  /** The assistant's token budget for a single request (see the worker). */
  maxTokens?: number;
  onAnswer?: (answer: WhistleAnswer) => void;
  /** Silence handling in the worker (see the `config` request); `pauseSeconds` ends requests at a pause. */
  endpoint?: { pauseSeconds?: number };
};

export type UseWhistleResult = {
  status: WhistleStatus;
  error?: string;
  /** Model download progress in [0, 1]. */
  progress: number;
  stats: WhistleStats;
  /** Everything captured since mount. */
  recording: Recording;
};

/**
 * Streams a track through the Whistle on-device speech model in a worker, the way Cactus's own live
 * demo does: one continuous stream per activation, re-decoded every `minPassMs` of new audio, with the
 * browser's noise suppression as the only filtering. The model loads on first activation (≈17 MB,
 * cached by the browser afterwards); audio never leaves the tab.
 */
export const useWhistle = ({
  track,
  active,
  language,
  keywords,
  minPassMs,
  recording: recordingProp,
  onResult,
  assistant,
  maxTokens,
  onAnswer,
  endpoint,
}: UseWhistleProps): UseWhistleResult => {
  const [status, setStatus] = useState<WhistleStatus>('idle');
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<WhistleStats>({});
  const [worker, setWorker] = useState<Worker>();
  const [ownRecording] = useState(() => new Recording());
  const recording = recordingProp ?? ownRecording;

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;
  const assistantRef = useRef(assistant);
  assistantRef.current = assistant;

  // Model loading is deferred to first activation so mounting the story downloads nothing.
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (active) {
      setRequested(true);
    }
  }, [active]);

  const keywordsKey = keywords?.join('\n') ?? '';
  useEffect(() => {
    if (!requested) {
      return;
    }

    const instance = new Worker(new URL('./whistle-worker.ts', import.meta.url), { type: 'module' });
    instance.onmessage = (event: MessageEvent<WhistleResponse>) => {
      const response = event.data;
      switch (response.type) {
        case 'progress': {
          setProgress(response.total > 0 ? response.loaded / response.total : 0);
          break;
        }
        case 'preparing': {
          setStatus('preparing');
          setProgress(1);
          break;
        }
        case 'ready': {
          setStatus('ready');
          setProgress(1);
          setStats((previous) => ({ ...previous, loadMs: response.loadMs }));
          break;
        }
        case 'result': {
          const lastWord = response.words.at(-1);
          setStats((previous) => ({
            ...previous,
            // A result with no pass (a stream ended in silence it had already heard) keeps the last timing.
            passMs: response.passMs > 0 ? response.passMs : previous.passMs,
            backlog: response.backlog,
            commitLag: lastWord ? response.received - lastWord.end : previous.commitLag,
          }));
          onResultRef.current?.(response.words, response.pending, response.ended);
          break;
        }
        case 'answer': {
          const { text, answer, answerMs, maxTokens, latencyMs } = response;
          setStats((previous) => ({ ...previous, answerLatency: latencyMs, answerMs }));
          onAnswerRef.current?.({ text, answer, answerMs, maxTokens, latencyMs });
          break;
        }
        case 'error': {
          log.error('whistle', { message: response.message });
          setStatus('error');
          setError(response.message);
          break;
        }
      }
    };

    setStatus('loading');
    instance.postMessage({
      type: 'init',
      assets: WHISTLE_ASSETS,
      language,
      offset: recording.duration,
      assistant: assistantRef.current,
    } satisfies WhistleRequest);
    setWorker(instance);
    return () => {
      instance.terminate();
      setWorker(undefined);
      setStatus('idle');
    };
  }, [requested, language, recording]);

  // Sent separately from `init` so changing latency or keywords mid-stream keeps the loaded model and the stream.
  useEffect(() => {
    if (worker && minPassMs !== undefined) {
      worker.postMessage({ type: 'config', minPassMs } satisfies WhistleRequest);
    }
  }, [worker, minPassMs]);
  useEffect(() => {
    if (worker && maxTokens !== undefined) {
      worker.postMessage({ type: 'config', maxTokens } satisfies WhistleRequest);
    }
  }, [worker, maxTokens]);
  const endpointOn = endpoint !== undefined;
  const pauseSeconds = endpoint?.pauseSeconds;
  useEffect(() => {
    if (worker) {
      worker.postMessage({
        type: 'config',
        endpoint: endpointOn ? { pauseSeconds } : false,
      } satisfies WhistleRequest);
    }
  }, [worker, endpointOn, pauseSeconds]);
  useEffect(() => {
    if (worker) {
      worker.postMessage({
        type: 'config',
        keywords: keywordsKey ? keywordsKey.split('\n') : [],
      } satisfies WhistleRequest);
    }
  }, [worker, keywordsKey]);

  // Capture runs only while active; the worker queues audio that arrives before the model is ready.
  useEffect(() => {
    if (!worker || !track || !active) {
      return;
    }

    let stopped = false;
    const capture = startCapture(track, (samples) => {
      recording.append(samples);
      const copy = samples.slice();
      worker.postMessage({ type: 'audio', samples: copy } satisfies WhistleRequest, [copy.buffer]);
    }).catch((err) => {
      if (!stopped) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
      return undefined;
    });

    return () => {
      stopped = true;
      void capture
        .then((handle) => handle?.stop())
        .then(() => worker.postMessage({ type: 'stop' } satisfies WhistleRequest));
    };
  }, [worker, track, active, recording]);

  return { status, error, progress, stats, recording };
};
