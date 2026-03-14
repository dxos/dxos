//
// Copyright 2026 DXOS.org
//

import { useMemo, useState } from 'react';

import { MixerEngine } from './mixer';

export type UseMixerEngineResult = {
  engine: MixerEngine;
  playing: boolean;
  outputNode: AudioNode | undefined;
};

/** Creates and manages a MixerEngine instance, tracking its output node for visualization. */
export const useMixerEngine = (): UseMixerEngineResult => {
  const [playing, setPlaying] = useState(false);
  const [outputNode, setOutputNode] = useState<AudioNode | undefined>();
  const engine = useMemo(
    () =>
      new MixerEngine({
        onStateChange: (state) => {
          setPlaying(state.playing);
          setOutputNode(state.outputNode);
        },
      }),
    [],
  );
  return { engine, playing, outputNode };
};
