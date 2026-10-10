//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import {
  Analyzer,
  type AnalyzerFrame,
  type AnalyzerOptions,
  DEFAULT_SENSITIVITY,
  type NoteEvent,
  openMicrophone,
  startCapture,
  synthesizeHandpanTone,
  synthesizeTak,
} from '#audio';

/** `microphone` listens to the instrument; `synth` analyzes tones played through {@link NoteAnalyzer.play}. */
export type AudioSourceKind = 'microphone' | 'synth';

export type NoteAnalyzerStatus = 'idle' | 'starting' | 'listening' | 'error';

export type UseNoteAnalyzerOptions = {
  source: AudioSourceKind;
  onNote?: (event: NoteEvent) => void;
  /** Every analysis frame (~90/s), called from the audio callback; keep it cheap and side-effect free of React state. */
  onFrame?: (frame: AnalyzerFrame) => void;
  analyzer?: Omit<AnalyzerOptions, 'sampleRate'>;
  /** Analyze synthesized strikes without playing them through the speakers. */
  silent?: boolean;
  /** Input gain (dB) applied before analysis and the visualizers. */
  gain?: number;
  /** Strike sensitivity (0–1). */
  sensitivity?: number;
};

export type NoteAnalyzer = {
  status: NoteAnalyzerStatus;
  error?: Error;
  /** Most recent analysis frame, refreshed once per animation frame. */
  frame?: AnalyzerFrame;
  /** Copy of the analyzed input for visualizers; disconnecting it does not affect analysis. */
  monitor?: AudioNode;
  /** Must be called from a user gesture: browsers only start audio (and grant the microphone) in one. */
  start: () => void;
  stop: () => void;
  /** Strikes a synthesized note (or `tak`) into the analyzer; only in `synth` mode while listening. */
  play: (strike: number | 'tak') => void;
};

type Session = {
  cancelled: boolean;
  dispose: () => void;
  play?: NoteAnalyzer['play'];
  gain?: GainNode;
  analyzer?: Analyzer;
};

const dbToGain = (db: number) => 10 ** (db / 20);

/** Runs the streaming {@link Analyzer} over a live audio source. */
export const useNoteAnalyzer = ({
  source,
  onNote,
  onFrame,
  analyzer,
  silent,
  gain = 0,
  sensitivity = DEFAULT_SENSITIVITY,
}: UseNoteAnalyzerOptions): NoteAnalyzer => {
  const [status, setStatus] = useState<NoteAnalyzerStatus>('idle');
  const [error, setError] = useState<Error>();
  const [frame, setFrame] = useState<AnalyzerFrame>();
  const [monitor, setMonitor] = useState<AudioNode>();
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const sessionRef = useRef<Session>(undefined);
  // Read at start and applied live, so moving a slider never restarts the audio session.
  const gainRef = useRef(gain);
  gainRef.current = gain;
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      session.cancelled = true;
      session.dispose();
      sessionRef.current = undefined;
    }
    setStatus('idle');
    setFrame(undefined);
    setMonitor(undefined);
  }, []);

  const start = useCallback(() => {
    stop();
    // Created and resumed synchronously so the call stays inside the user activation.
    const context = new AudioContext({ latencyHint: 'interactive' });
    void context.resume();

    let latest: AnalyzerFrame | undefined;
    let animation = 0;
    const cleanup: (() => void)[] = [];
    const session: Session = {
      cancelled: false,
      dispose: () => {
        cancelAnimationFrame(animation);
        // Reverse order detaches the tap before the nodes feeding it.
        cleanup.reverse().forEach((dispose) => dispose());
        void context.close();
      },
    };
    sessionRef.current = session;
    setStatus('starting');
    setError(undefined);

    const run = async () => {
      const notes = new Analyzer({ ...analyzer, sampleRate: context.sampleRate });
      notes.setSensitivity(sensitivityRef.current);
      session.analyzer = notes;
      let input: AudioNode;
      if (source === 'microphone') {
        const microphone = await openMicrophone(context);
        if (session.cancelled) {
          microphone.close();
          return;
        }
        cleanup.push(microphone.close);
        input = microphone.source;
      } else {
        // The capture tap keeps the bus rendering even when it is not routed to the speakers.
        const bus = new GainNode(context);
        if (!silent) {
          bus.connect(context.destination);
        }
        cleanup.push(() => bus.disconnect());
        input = bus;
        session.play = (strike) => {
          const seed = Math.floor(Math.random() * 0xffff);
          const samples =
            strike === 'tak'
              ? synthesizeTak({ sampleRate: context.sampleRate, seed })
              : synthesizeHandpanTone(strike, { sampleRate: context.sampleRate, seed });
          const buffer = new AudioBuffer({ length: samples.length, sampleRate: context.sampleRate });
          buffer.copyToChannel(samples, 0);
          const node = new AudioBufferSourceNode(context, { buffer });
          node.connect(bus);
          node.start();
        };
      }

      const inputGain = new GainNode(context, { gain: dbToGain(gainRef.current) });
      input.connect(inputGain);
      cleanup.push(() => inputGain.disconnect());
      session.gain = inputGain;

      const disconnect = await startCapture({
        context,
        source: inputGain,
        onSamples: (samples) => {
          const result = notes.push(samples);
          latest = result.frames.at(-1) ?? latest;
          result.frames.forEach((frame) => onFrameRef.current?.(frame));
          result.notes.forEach((note) => onNoteRef.current?.(note));
        },
      });
      // A session stopped mid-setup already closed the context, which releases the tap.
      if (session.cancelled) {
        return;
      }
      cleanup.push(disconnect);

      // Report listening only once the context is actually rendering.
      await context.resume();
      if (session.cancelled) {
        return;
      }

      // Visualizers call `disconnect()` on their source, which must not detach the analysis tap.
      const monitorNode = new GainNode(context);
      inputGain.connect(monitorNode);
      cleanup.push(() => monitorNode.disconnect());
      setMonitor(monitorNode);

      const tick = () => {
        setFrame(latest);
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
      setStatus('listening');
    };

    run().catch((err: Error) => {
      log.catch(err);
      if (!session.cancelled) {
        setError(err);
        setStatus('error');
      }
    });
  }, [source, analyzer, silent, stop]);

  useEffect(() => stop, [source, stop]);

  useEffect(() => {
    sessionRef.current?.gain?.gain.setTargetAtTime(dbToGain(gain), sessionRef.current.gain.context.currentTime, 0.05);
  }, [gain]);

  useEffect(() => {
    sessionRef.current?.analyzer?.setSensitivity(sensitivity);
  }, [sensitivity]);

  const play = useCallback<NoteAnalyzer['play']>((strike) => sessionRef.current?.play?.(strike), []);

  return { status, error, frame, monitor, start, stop, play };
};
