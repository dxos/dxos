//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { FrameHeader } from '@dxos/react-ui-canvas';

import { DataFlowView, type DataFlowViewProps } from './DataFlowView.tsx';
import { useTween } from './tween.ts';

/** One scene of a sequence: a diagram, how long it plays, and the caption that says what it shows. */
export type Scene = Pick<DataFlowViewProps, 'spec' | 'options' | 'theme' | 'grid' | 'revealed' | 'partitioned'> & {
  title: string;
  caption: string;
  /**
   * Consecutive scenes on one stage share a single diagram, which runs on between them rather than fading: the first
   * scene's options set it up, and each scene moves it on, to its own spec, reveal and split.
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
const FADE = 1000;

/**
 * Plays a sequence of data-flow diagrams as one story: each scene runs for its duration under its caption, then fades
 * into the next, stopping at the last. Controls step back and forward or pause.
 */
export const DataFlowSequence = ({ scenes, start = 0, autoplay = true }: DataFlowSequenceProps) => {
  const [index, setIndex] = useState(start);
  const [shown, setShown] = useState(true);
  const [playing, setPlaying] = useState(autoplay);
  // Whether the diagram fades with the caption: not between two scenes on one stage, where it runs on and morphs.
  const [morphing, setMorphing] = useState(false);
  const scene = scenes[index];
  // While it plays, every panel stays out of the picture unless the pointer is over the diagram.
  const [hovered, setHovered] = useState(false);
  // Reaching the last scene stops the timer but is not a pause: the panels stay away until someone pauses or hovers.
  const [ended, setEnded] = useState(false);
  const chrome = hovered || (!playing && !ended);
  // Faded on animation frames rather than by CSS, so a frame-by-frame render steps them with everything else.
  const captionOpacity = useTween(shown ? 1 : 0, FADE);
  const diagramOpacity = useTween(shown || morphing ? 1 : 0, FADE);
  const lead = (scene.stage && scenes.find((candidate) => candidate.stage === scene.stage)) || scene;

  // Fades the current scene out, then swaps in the one at `next`, which fades in as it mounts.
  const go = (next: number) => {
    // The sequence runs from the first scene to the last and stops there; it never wraps.
    const target = Math.min(Math.max(next, 0), scenes.length - 1);
    if (target === index) {
      return;
    }
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
    if (index === scenes.length - 1) {
      setPlaying(false);
      setEnded(true);
      return;
    }
    const timer = setTimeout(() => go(index + 1), scene.duration * 1000);
    return () => clearTimeout(timer);
  }, [index, playing, scene.duration]);

  return (
    // The canvas's own surface behind the scenes, so a cross-fade dips to the background rather than to black.
    <div
      className='dx-fill relative flex flex-col bg-base-surface'
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* The header has a strip of its own above the diagram, so the camera's fit never puts a block under it. */}
      <FrameHeader
        title={scene.title}
        caption={scene.caption}
        index={index}
        count={scenes.length}
        playing={playing}
        opacity={captionOpacity}
        controls={chrome}
        onPrevious={() => go(index - 1)}
        onNext={() => go(index + 1)}
        onPlayingChange={setPlaying}
      />
      <div className='dx-grow relative' style={{ opacity: diagramOpacity }}>
        <DataFlowView
          key={scene.stage ?? index}
          spec={scene.spec}
          options={lead.options}
          continuous={scene.stage !== undefined}
          theme={scene.theme}
          grid={scene.grid}
          revealed={scene.revealed}
          partitioned={scene.partitioned}
          chrome={chrome}
        />
      </div>
    </div>
  );
};
