//
// Copyright 2024 DXOS.org
// Adapted from: https://github.com/smplrspace/react-fps-stats
//

import React, { useEffect, useReducer, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type FPSProps = ThemedClassName<{
  width?: number;
  height?: number;
  bar?: string;
}>;

type State = {
  max: number;
  len: number;
  fps: number[];
  frames: number;
  prevTime: number;
};

const SEC = 1_000;

export const FPS = ({ classNames, width = 60, height = 30, bar = 'bg-cyan-500' }: FPSProps) => {
  const [{ fps, max, len }, dispatch] = useReducer(
    (state: State) => {
      const currentTime = Date.now();
      if (currentTime > state.prevTime + SEC) {
        const nextFPS = [
          ...new Array(Math.floor((currentTime - state.prevTime - SEC) / SEC)).fill(0),
          Math.max(1, Math.round((state.frames * SEC) / (currentTime - state.prevTime))),
        ];
        return {
          max: Math.max(state.max, ...nextFPS),
          len: Math.min(state.len + nextFPS.length, width),
          fps: [...state.fps, ...nextFPS].slice(-width),
          frames: 1,
          prevTime: currentTime,
        };
      } else {
        return { ...state, frames: state.frames + 1 };
      }
    },
    {
      max: 0,
      len: 0,
      fps: [],
      frames: 0,
      prevTime: Date.now(),
    },
  );

  const requestRef = useRef<number | null>(null);
  const tick = () => {
    dispatch();
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{ width: width + 6 }}
      className={mx(
        'relative flex flex-col p-0.5',
        'bg-baseSurface text-xs text-subdued font-thin pointer-events-none border border-separator',
        classNames,
      )}
    >
      <div>{fps[len - 1]} FPS</div>
      <div className='w-full relative' style={{ height }}>
        {fps.map((frame, i) => (
          <div
            key={`fps-${i}`}
            className={bar}
            style={{
              position: 'absolute',
              bottom: 0,
              right: `${len - 1 - i}px`,
              height: `${(height * frame) / max}px`,
              width: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
};
