//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { startCapture } from './capture.ts';
import { WHISTLE_ASSETS, type WhistleRequest, type WhistleResponse, type WhistleWord } from './protocol.ts';
import { Recording } from './recording.ts';

export type WhistleStatus = 'idle' | 'loading' | 'ready' | 'error';

export type WhistleStats = {
  /** Milliseconds from worker start to model loaded. */
  loadMs?: number;
  /** Duration of the latest pass. */
  passMs?: number;
  /** Seconds of captured audio waiting behind the latest pass. */
  backlog?: number;
  /** Seconds between the end of the latest committed word and the moment it was committed. */
  commitLag?: number;
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
  // The worker times words from the start of each stream; the recording keeps every stream back to back.
  const streamOffsetRef = useRef(0);

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
            passMs: response.passMs,
            backlog: response.backlog,
            commitLag: lastWord ? response.received - lastWord.end : previous.commitLag,
          }));
          const offset = streamOffsetRef.current;
          const words = response.words.map((word) => ({ ...word, start: word.start + offset, end: word.end + offset }));
          onResultRef.current?.(words, response.pending, response.ended);
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
    instance.postMessage({ type: 'init', assets: WHISTLE_ASSETS, language } satisfies WhistleRequest);
    setWorker(instance);
    return () => {
      instance.terminate();
      setWorker(undefined);
      setStatus('idle');
    };
  }, [requested, language]);

  // Sent separately from `init` so changing latency or keywords mid-stream keeps the loaded model and the stream.
  useEffect(() => {
    if (worker && minPassMs !== undefined) {
      worker.postMessage({ type: 'config', minPassMs } satisfies WhistleRequest);
    }
  }, [worker, minPassMs]);
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
    streamOffsetRef.current = recording.duration;
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
