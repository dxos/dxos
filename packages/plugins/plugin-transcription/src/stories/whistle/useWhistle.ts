//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { MediaStreamRecorder } from '@dxos/react-ui-transcription';

import { NoiseGate } from './noise-gate.ts';
import {
  WHISTLE_ASSETS,
  WHISTLE_SAMPLE_RATE,
  type WhistleRequest,
  type WhistleResponse,
  type WhistleWord,
} from './protocol.ts';
import { Recording } from './recording.ts';

/** Capture flush interval; short so audio reaches the engine as soon as a pass can take it. */
const CAPTURE_INTERVAL_MS = 100;

/** Full-scale value of the 16-bit samples {@link MediaStreamRecorder} emits. */
const INT16_SCALE = 0x7fff;

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
  /** Smallest batch of new audio, in milliseconds, worth a pass; lower commits sooner at more passes per second. */
  minPassMs?: number;
  /** Called after every pass with the words it committed (seconds from stream start) and the unconfirmed tail. */
  onResult?: (words: WhistleWord[], pending: string) => void;
};

export type UseWhistleResult = {
  status: WhistleStatus;
  error?: string;
  /** Model download progress in [0, 1]. */
  progress: number;
  /** Whether the noise gate currently hears speech. */
  speaking: boolean;
  stats: WhistleStats;
  /** Everything captured since mount, gated or not. */
  recording: Recording;
};

/**
 * Box-filter downsampler from the capture context's rate to 16 kHz; carries the fractional
 * remainder across chunks so chunk boundaries do not drift the timeline.
 */
class Downsampler {
  #carry = new Float64Array(0);

  constructor(private readonly _ratio: number) {}

  process(input: Float64Array): Float32Array {
    const samples = new Float64Array(this.#carry.length + input.length);
    samples.set(this.#carry);
    samples.set(input, this.#carry.length);
    const outputLength = Math.floor(samples.length / this._ratio);
    const output = new Float32Array(outputLength);
    for (let index = 0; index < outputLength; index++) {
      const from = Math.floor(index * this._ratio);
      const to = Math.max(from + 1, Math.floor((index + 1) * this._ratio));
      let sum = 0;
      for (let position = from; position < to; position++) {
        sum += samples[position];
      }
      output[index] = sum / (to - from) / INT16_SCALE;
    }
    this.#carry = samples.slice(Math.floor(outputLength * this._ratio));
    return output;
  }
}

/**
 * Streams a track through the Whistle on-device speech model in a worker. Only gated speech reaches
 * the model. The model loads on first activation (≈17 MB, cached by the browser afterwards); audio
 * never leaves the tab.
 */
export const useWhistle = ({
  track,
  active,
  language,
  keywords,
  minPassMs,
  onResult,
}: UseWhistleProps): UseWhistleResult => {
  const [status, setStatus] = useState<WhistleStatus>('idle');
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<WhistleStats>({});
  const [speaking, setSpeaking] = useState(false);
  const [worker, setWorker] = useState<Worker>();
  const [recording] = useState(() => new Recording());

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

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
    const send = (request: WhistleRequest, transfer: Transferable[] = []) => instance.postMessage(request, transfer);
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
          onResultRef.current?.(response.words, response.pending);
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
    send({
      type: 'init',
      assets: WHISTLE_ASSETS,
      language,
      keywords: keywordsKey ? keywordsKey.split('\n') : [],
      minPassMs,
    });
    setWorker(instance);
    return () => {
      instance.terminate();
      setWorker(undefined);
      setStatus('idle');
    };
    // `keywords` is read via the serialized `keywordsKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, language, keywordsKey, minPassMs]);

  // Capture runs only while active; the worker queues audio that arrives before the model is ready.
  useEffect(() => {
    if (!worker || !track || !active) {
      return;
    }

    const recorder = new MediaStreamRecorder({ mediaStreamTrack: track, config: { interval: CAPTURE_INTERVAL_MS } });
    let downsampler: Downsampler | undefined;
    const gate = new NoiseGate();
    recorder.setOnChunk((chunk) => {
      downsampler ??= new Downsampler(recorder.wavConfig.sampleRate / WHISTLE_SAMPLE_RATE);
      const audio = downsampler.process(chunk.data);
      const { samples, closed, open } = gate.process(audio);
      recording.append(audio, open);
      if (samples.length > 0) {
        worker.postMessage({ type: 'audio', samples } satisfies WhistleRequest, [samples.buffer]);
      }
      // A fresh stream per utterance keeps every pass short and stops the decoder carrying words
      // across the silence.
      if (closed) {
        worker.postMessage({ type: 'flush' } satisfies WhistleRequest);
      }
      setSpeaking(open);
    });

    void recorder.start();
    return () => {
      setSpeaking(false);
      void recorder.stop().then(() => worker.postMessage({ type: 'stop' } satisfies WhistleRequest));
    };
  }, [worker, track, active, recording]);

  return { status, error, progress, speaking, stats, recording };
};
