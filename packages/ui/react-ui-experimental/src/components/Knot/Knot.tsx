//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type KnotHandle, type Options, render } from './three';

export type KnotProps = {
  options?: Partial<Options>;
};

/**
 * Renders an animated, post-processed torus-knot mesh into a self-sized container.
 * Structural setup happens once on mount; subsequent `options` changes are streamed
 * through `KnotHandle.updateOptions` without rebuilding the scene.
 */
export const Knot = ({ options }: KnotProps = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const handleRef = useRef<KnotHandle | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const handle = render(ref.current, options);
    handleRef.current = handle;
    return () => {
      handle.dispose();
      handleRef.current = null;
    };
    // Intentionally one-shot: structural setup happens on mount. Live updates
    // flow through the dedicated `updateOptions` effect below.
  }, []);

  useEffect(() => {
    if (options) {
      handleRef.current?.updateOptions(options);
    }
  }, [options]);

  return <div ref={ref} className='relative w-full h-full' />;
};
