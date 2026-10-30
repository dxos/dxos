//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type ModuleCompiler } from '@dxos/animation';
import { isGeneratorNode } from '@dxos/scene';

import { type GeneratorFrames, GeneratorHost, type GeneratorSource } from '../generator/index.ts';
import { type View } from '../model/index.ts';

export type UseGeneratorFramesOptions = {
  /** The scene as drawn: what the generators bind to. */
  scene: View;
  /** The clock's time. */
  time: number;
  sources: Readonly<Record<string, GeneratorSource>>;
  compile?: ModuleCompiler;
  createWorker?: () => Worker;
};

/**
 * The frames of the scene's generator nodes at the clock's time (ANIMATION.md §6.6): one host per view, started when
 * the scene first has a generator, asked for each new time, answering with the latest it has drawn. Undefined while
 * there is nothing to draw.
 */
export const useGeneratorFrames = ({
  scene,
  time,
  sources,
  compile,
  createWorker,
}: UseGeneratorFramesOptions): GeneratorFrames | undefined => {
  const active = useMemo(() => Object.values(scene.nodes).some(isGeneratorNode), [scene]);
  const [frames, setFrames] = useState<GeneratorFrames>();
  // Made and disposed by one effect, so a remount (strict mode's included) gets a live host rather than a disposed one.
  const [host, setHost] = useState<GeneratorHost>();
  useEffect(() => {
    if (!active || !compile) {
      return;
    }
    const next = new GeneratorHost({ compile, createWorker, onFrames: setFrames });
    setHost(next);
    return () => {
      next.dispose();
      setHost(undefined);
    };
  }, [active, compile, createWorker]);
  useEffect(() => {
    if (host) {
      host.update(scene, sources);
      host.request(time);
    }
  }, [host, scene, sources, time]);
  return host ? frames : undefined;
};
