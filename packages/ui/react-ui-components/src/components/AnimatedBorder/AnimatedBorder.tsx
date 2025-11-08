//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const trail = [
  'absolute z-0 aspect-[2/1] w-16',
  'bg-[radial-gradient(at_100%_50%,_theme(colors.sky.500),_transparent_70%)]',
  '[offset-anchor:100%_50%] [offset-path:border-box]',
];

export type AnimatedBorderProps = ThemedClassName<PropsWithChildren<{ animate?: boolean }>>;

/**
 * AnimatedBorder using CSS Motion Path.
 * Based on https://cobian.dev/blog/animated-border
 */
export const AnimatedBorder = ({ children, classNames, animate = false }: AnimatedBorderProps) => {
  return (
    <div role='none' className='relative overflow-hidden rounded p-px'>
      <div role='none' className={mx('relative z-10 rounded bg-baseSurface text-sm', classNames)}>
        {children}
      </div>
      {animate && (
        <>
          <div role='none' className={mx('animate-trail', ...trail)} />
          <div role='none' className={mx('animate-trail-offset', ...trail)} />
        </>
      )}
    </div>
  );
};
