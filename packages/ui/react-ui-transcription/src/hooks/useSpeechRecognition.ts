//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { log } from '@dxos/log';

const cleanText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export type UseSpeechRecognitionProps = {
  active: boolean;
  onTranscript: (transcript: string) => void;
};

/**
 * Use browser speech recognition API to transcribe speech to text.
 */
export const useSpeechRecognition = ({ active, onTranscript }: UseSpeechRecognitionProps) => {
  const recognition = useMemo(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (!SpeechRecognition || !SpeechGrammarList) {
      log.error('Speech recognition not supported');
      return;
    }

    return Object.assign(new SpeechRecognition(), {
      grammars: new SpeechGrammarList(),
      continuous: true,
      interimResults: true,
      lang: 'en-US',
      maxAlternatives: 1,
      onresult: (event: any) => {
        const transcript = cleanText(event.results[event.resultIndex][0].transcript);
        onTranscript(transcript);
      },
      onerror: (event: any) => {
        log.error('Speech recognition error', { error: event.error });
      },
    });
  }, [onTranscript]);

  useEffect(() => {
    if (active) {
      recognition?.start();
    } else {
      recognition?.stop();
    }
  }, [active, recognition]);
};
