//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const emptyLines: string[] = [];

export type StatusLineProps = ThemedClassName<{
  line?: number;
  lines?: string[];
  transition?: number;
  advance?: number;
  autoAdvance?: boolean;
}>;

export const StatusLine = ({
  classNames,
  line = -1,
  lines = emptyLines,
  transition = 300,
  advance = 1_000,
  autoAdvance,
}: StatusLineProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLine, setCurrentLine] = useState(line);
  useEffect(() => {
    setCurrentLine(line);
  }, [line]);

  useEffect(() => {
    if (!autoAdvance) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev === lines.length - 1) {
          clearInterval(interval);
          return prev;
        }

        return prev + 1;
      });
    }, advance);

    return () => clearInterval(interval);
  }, [lines.length, autoAdvance, advance]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transition = `transform ${transition}ms ease-in-out`;
      containerRef.current.style.transform = `translateY(-${currentLine * 32}px)`;
    }
  }, [currentLine]);

  return (
    <div className={mx('relative h-[32px] overflow-hidden', classNames)}>
      <div ref={containerRef} className='h-[32px]'>
        <div className='flex flex-col'>
          {lines.map((line, i) => (
            <div key={i} className={mx('flex h-[32px] items-center')}>
              <span className='truncate'>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
