//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { audioConstraints } from '../audio/devices.ts';

export type MicrophoneTest = {
  analyser?: AnalyserNode;
  /** The label of the device being tested. */
  label?: string;
  error?: string;
  /** Call from a click: Chrome starts an AudioContext suspended otherwise. */
  start: () => Promise<void>;
  stop: () => void;
};

/** Opens a microphone for the level meter, without recording; restarts when the device changes while testing. */
export const useMicrophoneTest = (deviceId: string | undefined, onGranted?: () => void): MicrophoneTest => {
  const [analyser, setAnalyser] = useState<AnalyserNode>();
  const [label, setLabel] = useState<string>();
  const [error, setError] = useState<string>();
  const session = useRef<{ context: AudioContext; stream?: MediaStream }>(undefined);

  const stop = useCallback(() => {
    session.current?.stream?.getTracks().forEach((track) => track.stop());
    void session.current?.context.close();
    session.current = undefined;
    setAnalyser(undefined);
    setLabel(undefined);
  }, []);

  const start = useCallback(async () => {
    stop();
    // Created before any await, inside the click.
    const context = new AudioContext();
    session.current = { context };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(deviceId) });
      if (session.current?.context !== context) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      session.current.stream = stream;
      const node = context.createAnalyser();
      node.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(node);
      await context.resume();
      setError(undefined);
      setLabel(stream.getAudioTracks()[0]?.label);
      setAnalyser(node);
      onGranted?.();
    } catch (err) {
      log.catch(err);
      setError(err instanceof Error ? err.message : String(err));
      stop();
    }
  }, [deviceId, stop, onGranted]);

  // A device change while testing switches the test to it.
  const testing = analyser !== undefined;
  useEffect(() => {
    if (testing) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => stop, [stop]);

  return { analyser, label, error, start, stop };
};
