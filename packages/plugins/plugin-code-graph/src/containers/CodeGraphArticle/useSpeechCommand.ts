//
// Copyright 2026 DXOS.org
//

import { useCallback, useRef, useState } from 'react';

import * as Whistle from '@dxos/plugin-transcription/Whistle';
import { useAudioTrack } from '@dxos/react-ui-transcription';

/** A pause this long ends a spoken command; short, since commands are a few words. */
const PAUSE_SECONDS = 0.7;

/** Paths, packages and the words the command loop knows, so Whistle spells them as the index does. */
const KEYWORDS = ['ECHO', 'HALO', 'MESH', 'graph', 'package', 'exports', 'depends', 'identity', 'service', 'plugin'];

export type SpeechCommand = {
  listening: boolean;
  /** The model is downloading or warming up. */
  loading: boolean;
  error?: string;
  /** What has been heard of the current command. */
  heard?: string;
  toggle: () => void;
};

/**
 * Hands-free commands through Whistle, the on-device speech model: while on, every pause ends a command, which is
 * handed to `onCommand`. Audio never leaves the tab.
 */
export const useSpeechCommand = (onCommand: (command: string) => void): SpeechCommand => {
  const [active, setActive] = useState(false);
  const [heard, setHeard] = useState<string>();
  const track = useAudioTrack(active, Whistle.WHISTLE_AUDIO_CONSTRAINTS);
  const words = useRef<string[]>([]);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const onResult = useCallback((committed: Whistle.WhistleWord[], pending: string, ended: boolean) => {
    words.current.push(...committed.map(({ word }) => word));
    const text = [...words.current, pending.trim()].join(' ').replace(/\s+/g, ' ').trim();
    if (ended) {
      words.current = [];
      setHeard(undefined);
      if (text.length > 0) {
        onCommandRef.current(text);
      }
      return;
    }
    setHeard(text || undefined);
  }, []);

  const whistle = Whistle.useWhistle({
    track,
    active,
    language: 'en',
    keywords: KEYWORDS,
    endpoint: { pauseSeconds: PAUSE_SECONDS },
    onResult,
  });

  const toggle = useCallback(() => {
    words.current = [];
    setHeard(undefined);
    setActive((value) => !value);
  }, []);

  return {
    listening: active && whistle.status === 'ready',
    loading: active && (whistle.status === 'loading' || whistle.status === 'preparing'),
    error: whistle.error,
    heard,
    toggle,
  };
};
