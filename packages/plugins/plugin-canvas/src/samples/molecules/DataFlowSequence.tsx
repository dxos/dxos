//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';

/** One scene of a sequence: a diagram, how long it plays, and the caption that says what it shows. */
export type Scene = Pick<DataFlowViewProps, 'spec' | 'options' | 'theme' | 'revealed'> & {
  title: string;
  caption: string;
  /**
   * Consecutive scenes on one stage share a single diagram, which runs on between them rather than fading: the first
   * scene's spec and options set it up, and each scene changes only what it reveals.
   */
  stage?: string;
  /** Seconds the scene plays before the next. */
  duration: number;
};

export type DataFlowSequenceProps = {
  scenes: readonly Scene[];
  /** The scene to start at. */
  start?: number;
  /** Plays on by itself; off, it stays on the current scene until a control moves it. */
  autoplay?: boolean;
};

/** Milliseconds a scene takes to fade out, and the next to fade in. */
const FADE = 600;

/** The bar the canvas's own toolbars sit in, so the controls match them. */
const BAR = 'gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

/**
 * Plays a sequence of data-flow diagrams as one story: each scene runs for its duration under its caption, then fades
 * into the next, looping back to the first. Controls step back and forward or pause.
 */
export const DataFlowSequence = ({ scenes, start = 0, autoplay = true }: DataFlowSequenceProps) => {
  const [index, setIndex] = useState(start);
  const [shown, setShown] = useState(true);
  const [playing, setPlaying] = useState(autoplay);
  // Whether the diagram fades with the caption: not between two scenes on one stage, where it runs on and morphs.
  const [morphing, setMorphing] = useState(false);
  const scene = scenes[index];
  const lead = (scene.stage && scenes.find((candidate) => candidate.stage === scene.stage)) || scene;

  // Fades the current scene out, then swaps in the one at `next`, which fades in as it mounts.
  const go = (next: number) => {
    const target = (next + scenes.length) % scenes.length;
    setMorphing(scene.stage !== undefined && scenes[target].stage === scene.stage);
    setShown(false);
    setTimeout(() => {
      setIndex(target);
      setShown(true);
    }, FADE);
  };

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = setTimeout(() => go(index + 1), scene.duration * 1000);
    return () => clearTimeout(timer);
  }, [index, playing, scene.duration]);

  return (
    <div className='dx-fill relative flex flex-col'>
      {/* The caption has a strip of its own above the diagram, so the camera's fit never puts a block under it. */}
      <div
        className='shrink-0 flex flex-col items-center gap-1 py-3 bg-base-surface transition-opacity'
        style={{ opacity: shown ? 1 : 0, transitionDuration: `${FADE}ms` }}
      >
        <div className='text-sm text-fg-muted'>
          {index + 1} / {scenes.length}
        </div>
        <div className='text-2xl'>{scene.title}</div>
        <div className='text-base text-fg-muted'>{scene.caption}</div>
      </div>
      <div
        className='dx-grow relative transition-opacity'
        style={{ opacity: shown || morphing ? 1 : 0, transitionDuration: `${FADE}ms` }}
      >
        <DataFlowView
          key={scene.stage ?? index}
          spec={lead.spec}
          options={lead.options}
          theme={scene.theme}
          revealed={scene.revealed}
        />
      </div>
      <div className='absolute top-2 right-2 w-max'>
        <Toolbar.Root classNames={BAR}>
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--caret-left--regular'
            label='Previous scene'
            onClick={() => go(index - 1)}
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
            label={playing ? 'Pause' : 'Play'}
            onClick={() => setPlaying((value) => !value)}
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--caret-right--regular'
            label='Next scene'
            onClick={() => go(index + 1)}
          />
        </Toolbar.Root>
      </div>
    </div>
  );
};
