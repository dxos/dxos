//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type ThemedClassName, useDynamicRef } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type TextBlockProps = ThemedClassName<{
  text: string;
  delay?: number;
}>;

export const TextBlock = ({ classNames, text, delay = 0 }: TextBlockProps) => {
  const [current, setCurrent] = useState('');
  const currentRef = useDynamicRef(current);

  useEffect(() => {
    const idx = text.indexOf(currentRef.current);
    let next = text;
    if (idx === 0) {
      next = text.slice(currentRef.current.length);
    } else {
      setCurrent('');
    }

    let cancelled = false;
    void (async () => {
      for await (const char of streamText(next, delay)) {
        if (cancelled) {
          break;
        }

        // TODO(burdon): Break words.
        setCurrent((prev) => {
          return prev + char;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, delay]);

  return <p className={mx(classNames)}>{current}</p>;
};

async function* streamText(text: string, delay: number) {
  for (const char of text) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
