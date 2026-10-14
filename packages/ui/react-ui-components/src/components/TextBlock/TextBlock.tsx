//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

export type TextBlockProps = Util.ThemedClassName<{
  text: string;
  delay?: number;
}>;

export const TextBlock = ({ classNames, text, delay = 0 }: TextBlockProps) => {
  const [current, setCurrent] = useState('');
  const currentRef = Hooks.useDynamicRef(current);

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
