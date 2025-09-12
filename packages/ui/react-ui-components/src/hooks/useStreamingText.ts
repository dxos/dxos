//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { useDynamicRef } from '@dxos/react-ui';

/**
 * Streams text character by character with a delay.
 */
export const useStreamingText = (text = '', delay = 10): [string, boolean] => {
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
  }, [text, delay]);

  return [current, current.length === text.length];
};

/**
 *
 */
// TODO(burdon): Stream complete XML tags.
async function* streamText(text: string, delay: number) {
  for (const char of text) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
