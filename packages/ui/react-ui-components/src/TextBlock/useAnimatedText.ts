//
// Copyright https://buildui.com/recipes/use-animated-text
// Copyright 2025 DXOS.org
//

// TODO(burdon): Remove dep; https://www.typeitjs.com
import { animate } from 'framer-motion';
import { useEffect, useState } from 'react';

const delimiter = ''; // or " " to split by word

export const useAnimatedText = (text: string) => {
  const [cursor, setCursor] = useState(0);
  const [startingCursor, setStartingCursor] = useState(0);
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setStartingCursor(text.startsWith(prevText) ? cursor : 0);
  }

  useEffect(() => {
    const controls = animate(startingCursor, text.split(delimiter).length, {
      duration: 0.2,
      ease: 'linear',
      onUpdate: (latest) => {
        setCursor(Math.floor(latest));
      },
    });

    return () => controls.stop();
  }, [startingCursor, text]);

  return text.split(delimiter).slice(0, cursor).join(delimiter) + (cursor === text.split(delimiter).length ? '' : ' ▌');
};
