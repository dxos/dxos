//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { useDynamicRef } from '@dxos/react-ui';

// TODO(burdon): Remove generator.
// TODO(burdon): Needs to work with markdown so can't do special character effects.

/**
 * Streams text character by character with a delay.
 */
export const useStreamingText = (text: string, cps?: number): [string, boolean] => {
  const [current, setCurrent] = useState('');
  const currentRef = useDynamicRef(current);

  useEffect(() => {
    let cancelled = false;
    const idx = text.indexOf(currentRef.current);
    let next = text;
    if (idx === 0) {
      next = text.slice(currentRef.current.length);
    } else {
      setCurrent('');
    }

    const delay = cps ? 1_000 / cps : 10;
    void (async () => {
      for await (const chunk of streamText(next, delay)) {
        if (cancelled) {
          break;
        }

        setCurrent((prev) => {
          return prev + chunk;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, cps]);

  return [current, current.length === text.length];
};

async function* streamText(text: string, delay: number) {
  for (const char of text) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
